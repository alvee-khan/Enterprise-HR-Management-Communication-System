import prisma from '../config/prisma.js';
import { screenResume } from '../utils/resumeScreener.js';
import { createAuditLog } from '../utils/auditLogger.js';
import fs from 'fs';
import path from 'path';

// ---- JOBS ----
export const getJobs = async (req, res, next) => {
  try {
    const where = {};
    if (req.user.role !== 'superAdmin') where.companyId = req.user.companyId;
    const { status, search } = req.query;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const jobs = await prisma.job.findMany({
      where,
      include: {
        department: { select: { id: true, name: true } },
        postedBy: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ success: true, data: jobs });
  } catch (error) { next(error); }
};

export const createJob = async (req, res, next) => {
  try {
    const { departmentId, closingDate, ...rest } = req.body;
    const job = await prisma.job.create({
      data: {
        ...rest,
        companyId: req.user.companyId,
        postedById: req.user.id,
        departmentId: departmentId ? Number(departmentId) : null,
        closingDate: closingDate ? new Date(closingDate) : null,
        requirements: req.body.requirements || [],
        responsibilities: req.body.responsibilities || [],
        requiredSkills: req.body.requiredSkills || [],
        preferredSkills: req.body.preferredSkills || [],
        tags: req.body.tags || []
      }
    });
    res.status(201).json({ success: true, message: 'Job posted', data: job });
  } catch (error) { next(error); }
};

export const updateJob = async (req, res, next) => {
  try {
    const updateData = { ...req.body };
    delete updateData.companyId;
    delete updateData.postedById;
    if (updateData.departmentId) updateData.departmentId = Number(updateData.departmentId);
    if (updateData.closingDate) updateData.closingDate = new Date(updateData.closingDate);

    const job = await prisma.job.update({
      where: { id: Number(req.params.id) },
      data: updateData
    });
    res.status(200).json({ success: true, data: job });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Job not found' });
    next(error);
  }
};

export const deleteJob = async (req, res, next) => {
  try {
    await prisma.job.delete({ where: { id: Number(req.params.id) } });
    res.status(200).json({ success: true, message: 'Job deleted' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Job not found' });
    next(error);
  }
};

// ---- CANDIDATES ----
export const getCandidates = async (req, res, next) => {
  try {
    const { jobId, status, search } = req.query;
    const where = { companyId: req.user.companyId };
    if (jobId) where.jobId = Number(jobId);
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const candidates = await prisma.candidate.findMany({
      where,
      include: {
        job: { select: { id: true, title: true } }
      },
      orderBy: [{ matchScore: 'desc' }, { createdAt: 'desc' }]
    });

    res.status(200).json({ success: true, data: candidates });
  } catch (error) { next(error); }
};

export const getCandidate = async (req, res, next) => {
  try {
    const candidate = await prisma.candidate.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        job: { select: { id: true, title: true, requiredSkills: true, experience: true, education: true } },
        resume: true
      }
    });

    if (!candidate) return res.status(404).json({ success: false, message: 'Candidate not found' });
    res.status(200).json({ success: true, data: candidate });
  } catch (error) { next(error); }
};

export const createCandidate = async (req, res, next) => {
  try {
    const { jobId, ...rest } = req.body;
    const candidate = await prisma.candidate.create({
      data: {
        ...rest,
        jobId: Number(jobId),
        companyId: req.user.companyId,
        skillsMatched: req.body.skillsMatched || [],
        skillsMissing: req.body.skillsMissing || [],
        notes: req.body.notes || [],
        pipelineHistory: req.body.pipelineHistory || []
      }
    });

    await prisma.job.update({
      where: { id: Number(jobId) },
      data: { applicationCount: { increment: 1 } }
    });

    res.status(201).json({ success: true, message: 'Candidate added', data: candidate });
  } catch (error) { next(error); }
};

export const updateCandidateStatus = async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const candidate = await prisma.candidate.findUnique({ where: { id: Number(req.params.id) } });
    if (!candidate) return res.status(404).json({ success: false, message: 'Candidate not found' });

    const pipelineHistory = Array.isArray(candidate.pipelineHistory) ? candidate.pipelineHistory : [];
    pipelineHistory.push({ status: candidate.status, changedById: req.user.id, changedByName: req.user.name, changedAt: new Date(), notes });

    const currentNotes = Array.isArray(candidate.notes) ? candidate.notes : [];
    if (notes) {
      currentNotes.push({ text: notes, addedById: req.user.id, addedByName: req.user.name, createdAt: new Date() });
    }

    const updated = await prisma.candidate.update({
      where: { id: candidate.id },
      data: {
        status,
        pipelineHistory,
        notes: currentNotes
      }
    });

    res.status(200).json({ success: true, message: 'Status updated', data: updated });
  } catch (error) { next(error); }
};

export const uploadResume = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No resume file uploaded' });

    const candidateId = Number(req.body.candidateId);
    const jobId = Number(req.body.jobId);
    const fileUrl = `/uploads/resumes/${req.file.filename}`;

    // Extract text from resume file
    let rawText = '';
    try {
      if (req.file.mimetype === 'application/pdf') {
        const pdfParse = (await import('pdf-parse')).default;
        const buffer = fs.readFileSync(req.file.path);
        const parsed = await pdfParse(buffer);
        rawText = parsed.text;
      } else if (req.file.originalname.endsWith('.docx')) {
        const mammoth = (await import('mammoth')).default;
        const result = await mammoth.extractRawText({ path: req.file.path });
        rawText = result.value;
      } else {
        rawText = fs.readFileSync(req.file.path, 'utf8');
      }
    } catch (e) {
      console.error('Text extraction error:', e.message);
    }

    // Get job requirements
    const job = await prisma.job.findUnique({ where: { id: jobId } });

    // Screen resume
    const scores = screenResume({ text: rawText, job: job || {} });

    // Save resume record
    const resume = await prisma.resume.upsert({
      where: { candidateId },
      create: {
        candidateId,
        jobId,
        companyId: req.user.companyId,
        fileUrl,
        rawText,
        detectedSkills: scores.skillsMatched || [],
        detectedExperience: scores.detectedExperience || 0,
        detectedEducation: scores.detectedEducation || '',
        skillMatchScore: scores.skillMatchScore || 0,
        experienceScore: scores.experienceScore || 0,
        educationScore: scores.educationScore || 0,
        overallScore: scores.overallScore || 0,
        isScreened: true,
        screenedAt: new Date()
      },
      update: {
        fileUrl,
        rawText,
        detectedSkills: scores.skillsMatched || [],
        detectedExperience: scores.detectedExperience || 0,
        detectedEducation: scores.detectedEducation || '',
        skillMatchScore: scores.skillMatchScore || 0,
        experienceScore: scores.experienceScore || 0,
        educationScore: scores.educationScore || 0,
        overallScore: scores.overallScore || 0,
        isScreened: true,
        screenedAt: new Date()
      }
    });

    // Update candidate with score
    await prisma.candidate.update({
      where: { id: candidateId },
      data: {
        resumeUrl: fileUrl,
        resumeText: rawText,
        matchScore: scores.overallScore || 0,
        skillsMatched: scores.skillsMatched || [],
        skillsMissing: scores.skillsMissing || []
      }
    });

    res.status(200).json({ success: true, message: 'Resume uploaded and screened', data: { resume, scores } });
  } catch (error) { next(error); }
};

export const getRankedCandidates = async (req, res, next) => {
  try {
    const jobId = Number(req.params.jobId);
    const candidates = await prisma.candidate.findMany({
      where: { jobId, companyId: req.user.companyId },
      orderBy: { matchScore: 'desc' }
    });

    const ranked = candidates.map((c, i) => ({ ...c, rank: i + 1 }));
    res.status(200).json({ success: true, data: ranked });
  } catch (error) { next(error); }
};
