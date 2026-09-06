import prisma from '../config/prisma.js';
import { createNotification } from '../utils/notificationHelper.js';
import { sendInterviewEmail } from '../utils/email.js';
import moment from 'moment';

export const getInterviews = async (req, res, next) => {
  try {
    const where = { companyId: req.user.companyId };
    const { candidateId, jobId, status } = req.query;
    if (candidateId) where.candidateId = Number(candidateId);
    if (jobId) where.jobId = Number(jobId);
    if (status) where.status = status;

    const interviews = await prisma.interview.findMany({
      where,
      include: {
        candidate: { select: { id: true, name: true, email: true } },
        job: { select: { id: true, title: true } },
        interviewers: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        }
      },
      orderBy: { scheduledAt: 'asc' }
    });

    const mapped = interviews.map(i => ({
      ...i,
      interviewers: i.interviewers.map(it => it.user)
    }));

    res.status(200).json({ success: true, data: mapped });
  } catch (error) { next(error); }
};

export const scheduleInterview = async (req, res, next) => {
  try {
    const { candidateId, jobId, interviewers, scheduledAt, ...rest } = req.body;
    const interview = await prisma.interview.create({
      data: {
        ...rest,
        candidateId: Number(candidateId),
        jobId: Number(jobId),
        companyId: req.user.companyId,
        scheduledById: req.user.id,
        scheduledAt: new Date(scheduledAt),
        criteria: req.body.criteria || [],
        interviewers: Array.isArray(interviewers) && interviewers.length > 0 ? {
          create: interviewers.map(uid => ({ userId: Number(uid) }))
        } : undefined
      }
    });

    const candidate = await prisma.candidate.findUnique({ where: { id: Number(candidateId) } });

    // Send email to candidate
    if (candidate?.email) {
      await sendInterviewEmail(
        candidate.email, candidate.name,
        moment(scheduledAt).format('DD MMM YYYY, hh:mm A'),
        req.body.type || 'Phone', req.body.meetLink
      );
    }

    // Notify interviewers
    for (const interviewerId of interviewers || []) {
      await createNotification({
        userId: Number(interviewerId),
        companyId: req.user.companyId,
        type: 'interview_scheduled',
        title: 'Interview Scheduled',
        message: `You have an interview with ${candidate?.name} on ${moment(scheduledAt).format('DD MMM YYYY')}`,
        link: `/interviews/${interview.id}`
      });
    }

    res.status(201).json({ success: true, message: 'Interview scheduled', data: interview });
  } catch (error) { next(error); }
};

export const updateInterview = async (req, res, next) => {
  try {
    const { interviewers, scheduledAt, ...rest } = req.body;
    const updateData = { ...rest };
    delete updateData.companyId;
    delete updateData.scheduledById;
    if (scheduledAt) updateData.scheduledAt = new Date(scheduledAt);

    if (Array.isArray(interviewers)) {
      await prisma.interviewInterviewer.deleteMany({ where: { interviewId: Number(req.params.id) } });
      updateData.interviewers = {
        create: interviewers.map(uid => ({ userId: Number(uid) }))
      };
    }

    const interview = await prisma.interview.update({
      where: { id: Number(req.params.id) },
      data: updateData,
      include: {
        candidate: { select: { id: true, name: true, email: true } },
        interviewers: { include: { user: { select: { id: true, name: true, email: true } } } }
      }
    });

    res.status(200).json({
      success: true,
      data: { ...interview, interviewers: interview.interviewers.map(it => it.user) }
    });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Interview not found' });
    next(error);
  }
};

export const submitFeedback = async (req, res, next) => {
  try {
    const { feedback, rating, result, criteria } = req.body;
    const interview = await prisma.interview.update({
      where: { id: Number(req.params.id) },
      data: {
        feedback,
        rating: rating ? Number(rating) : undefined,
        result,
        criteria: criteria || undefined,
        status: 'Completed'
      }
    });

    if (interview && result === 'Pass') {
      await prisma.candidate.update({
        where: { id: interview.candidateId },
        data: { status: 'Selected', rating: rating ? Number(rating) : undefined }
      });
    } else if (interview && result === 'Fail') {
      await prisma.candidate.update({
        where: { id: interview.candidateId },
        data: { status: 'Rejected' }
      });
    }

    res.status(200).json({ success: true, message: 'Feedback submitted', data: interview });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Interview not found' });
    next(error);
  }
};
