import prisma from '../config/prisma.js';
import { generateAttendanceQR, verifyQRToken } from '../utils/qrGenerator.js';
import moment from 'moment';

export const checkIn = async (req, res, next) => {
  try {
    const { qrData } = req.body;
    const today = moment().startOf('day').toDate();

    if (qrData) {
      const { valid, payload, error } = await verifyQRToken(qrData);
      if (!valid) return res.status(400).json({ success: false, message: error });
      if (payload.companyId !== String(req.user.companyId)) {
        return res.status(403).json({ success: false, message: 'QR code belongs to different company' });
      }
    }

    const employee = await prisma.employee.findFirst({ where: { user: { id: req.user.id } } });
    if (!employee) return res.status(404).json({ success: false, message: 'Employee profile not found' });

    const existing = await prisma.attendance.findFirst({ where: { employeeId: employee.id, date: today } });
    if (existing) return res.status(400).json({ success: false, message: 'Already checked in today' });

    const company = await prisma.company.findUnique({ where: { id: req.user.companyId } });
    const settings = company?.settings || {};
    const workStart = settings.workingHours?.start || '09:00';
    const [startH, startM] = workStart.split(':').map(Number);
    const workStartTime = moment().startOf('day').add(startH, 'hours').add(startM, 'minutes');
    const now = moment();

    const isLate = now.isAfter(workStartTime.clone().add(15, 'minutes'));
    const lateMinutes = isLate ? now.diff(workStartTime, 'minutes') : 0;

    const attendance = await prisma.attendance.create({
      data: {
        employeeId: employee.id,
        userId: req.user.id,
        companyId: req.user.companyId,
        date: today,
        checkIn: new Date(),
        status: isLate ? 'Late' : 'Present',
        isLate,
        lateMinutes,
        checkInMethod: qrData ? 'qr' : 'web'
      }
    });

    res.status(201).json({ success: true, message: 'Checked in successfully', data: attendance });
  } catch (error) {
    next(error);
  }
};

export const checkOut = async (req, res, next) => {
  try {
    const employee = await prisma.employee.findFirst({ where: { user: { id: req.user.id } } });
    if (!employee) return res.status(404).json({ success: false, message: 'Employee profile not found' });

    const today = moment().startOf('day').toDate();
    const attendance = await prisma.attendance.findFirst({ where: { employeeId: employee.id, date: today } });
    if (!attendance) return res.status(404).json({ success: false, message: 'No check-in found for today' });
    if (attendance.checkOut) return res.status(400).json({ success: false, message: 'Already checked out' });

    const checkOut = new Date();
    const workingHours = moment(checkOut).diff(moment(attendance.checkIn), 'minutes');

    const company = await prisma.company.findUnique({ where: { id: req.user.companyId } });
    const settings = company?.settings || {};
    const workEnd = settings.workingHours?.end || '17:00';
    const [endH, endM] = workEnd.split(':').map(Number);
    const workEndTime = moment().startOf('day').add(endH, 'hours').add(endM, 'minutes');
    const isEarlyLeave = moment(checkOut).isBefore(workEndTime.clone().subtract(15, 'minutes'));
    const earlyLeaveMinutes = isEarlyLeave ? workEndTime.diff(moment(checkOut), 'minutes') : 0;

    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: { checkOut, workingHours, isEarlyLeave, earlyLeaveMinutes }
    });

    res.status(200).json({ success: true, message: 'Checked out successfully', data: updated });
  } catch (error) {
    next(error);
  }
};

export const getAttendance = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const { employeeId, month, year, startDate, endDate, status } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;

    const where = { companyId };

    if (req.user.role === 'employee') {
      const emp = await prisma.employee.findFirst({ where: { user: { id: req.user.id } } });
      if (emp) where.employeeId = emp.id;
    } else if (employeeId) {
      where.employeeId = Number(employeeId);
    }

    if (month && year) {
      where.date = {
        gte: moment(`${year}-${month}-01`).startOf('month').toDate(),
        lte: moment(`${year}-${month}-01`).endOf('month').toDate()
      };
    } else if (startDate && endDate) {
      where.date = { gte: new Date(startDate), lte: new Date(endDate) };
    }

    if (status) where.status = status;

    const [records, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        include: {
          employee: { select: { name: true, employeeCode: true, profileImage: true, departmentId: true } }
        },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.attendance.count({ where })
    ]);

    res.status(200).json({
      success: true,
      data: records,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
};

export const generateQR = async (req, res, next) => {
  try {
    const { date } = req.query;
    const { qrDataUrl, token, payload } = await generateAttendanceQR(req.user.companyId, date);
    res.status(200).json({ success: true, data: { qrDataUrl, token, date: payload.date, expires: payload.expires } });
  } catch (error) {
    next(error);
  }
};

export const getMonthlyReport = async (req, res, next) => {
  try {
    const { month, year, employeeId } = req.query;
    const companyId = req.user.companyId;

    const where = {
      companyId,
      date: {
        gte: moment(`${year}-${month}-01`).startOf('month').toDate(),
        lte: moment(`${year}-${month}-01`).endOf('month').toDate()
      }
    };
    if (employeeId) where.employeeId = Number(employeeId);

    const records = await prisma.attendance.findMany({
      where,
      include: { employee: { select: { name: true, employeeCode: true, departmentId: true } } }
    });

    const summary = {
      present: records.filter(r => r.status === 'Present').length,
      absent: records.filter(r => r.status === 'Absent').length,
      late: records.filter(r => r.status === 'Late').length,
      halfDay: records.filter(r => r.status === 'HalfDay').length,
      onLeave: records.filter(r => r.status === 'OnLeave').length,
      totalWorkingHours: records.reduce((sum, r) => sum + (r.workingHours || 0), 0)
    };

    res.status(200).json({ success: true, data: { records, summary } });
  } catch (error) {
    next(error);
  }
};
