import prisma from '../config/prisma.js';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import moment from 'moment';

const getCompanyId = (req) => req.user.role === 'superAdmin' && req.query.companyId ? Number(req.query.companyId) : req.user.companyId;

export const getDashboardStats = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req);
    const today = moment().startOf('day').toDate();
    const monthStart = moment().startOf('month').toDate();

    const [
      totalEmployees, activeEmployees, totalDepartments,
      todayPresent, pendingLeaves, openJobs, pendingTasks, totalCompanies
    ] = await Promise.all([
      prisma.employee.count({ where: { companyId } }),
      prisma.employee.count({ where: { companyId, status: 'Active' } }),
      prisma.department.count({ where: { companyId, isActive: true } }),
      prisma.attendance.count({ where: { companyId, date: today, status: { in: ['Present', 'Late'] } } }),
      prisma.leave.count({ where: { companyId, status: 'Pending' } }),
      prisma.job.count({ where: { companyId, status: 'Open' } }),
      prisma.task.count({ where: { companyId, status: { not: 'Completed' } } }),
      prisma.company.count({ where: { isActive: true } })
    ]);

    // Monthly attendance records for trend
    const monthAttendance = await prisma.attendance.findMany({
      where: { companyId, date: { gte: monthStart } },
      select: { date: true, status: true }
    });

    const dayMap = {};
    monthAttendance.forEach(a => {
      const day = moment(a.date).date();
      if (!dayMap[day]) dayMap[day] = { day, present: 0, late: 0, absent: 0 };
      if (a.status === 'Present') dayMap[day].present++;
      else if (a.status === 'Late') dayMap[day].late++;
      else if (a.status === 'Absent') dayMap[day].absent++;
    });
    const attendanceTrend = Object.values(dayMap).sort((a, b) => a.day - b.day).map(d => ({
      _id: { day: d.day },
      present: d.present,
      late: d.late,
      absent: d.absent
    }));

    // Department headcount
    const departments = await prisma.department.findMany({
      where: { companyId, isActive: true },
      include: {
        employees: { where: { status: 'Active' }, select: { id: true } }
      }
    });
    const deptHeadcount = departments.map(d => ({
      name: d.name,
      count: d.employees.length
    }));

    // Leave status distribution
    const leavesThisMonth = await prisma.leave.findMany({
      where: { companyId, createdAt: { gte: monthStart } },
      select: { status: true }
    });
    const leaveStatusMap = {};
    leavesThisMonth.forEach(l => {
      leaveStatusMap[l.status] = (leaveStatusMap[l.status] || 0) + 1;
    });
    const leaveStats = Object.keys(leaveStatusMap).map(status => ({
      _id: status,
      count: leaveStatusMap[status]
    }));

    // Payroll for current month
    const currentMonth = moment().month() + 1;
    const currentYear = moment().year();
    const payrollAgg = await prisma.payroll.aggregate({
      where: { companyId, year: currentYear, month: currentMonth },
      _sum: { netSalary: true, grossSalary: true },
      _count: { id: true }
    });

    const payrollSummary = {
      totalNet: payrollAgg._sum.netSalary || 0,
      totalGross: payrollAgg._sum.grossSalary || 0,
      count: payrollAgg._count.id || 0
    };

    res.status(200).json({
      success: true,
      data: {
        stats: { totalEmployees, activeEmployees, totalDepartments, todayPresent, pendingLeaves, openJobs, pendingTasks, totalCompanies },
        attendanceTrend,
        deptHeadcount,
        leaveStats,
        payrollSummary
      }
    });
  } catch (error) { next(error); }
};

export const getEmployeeDashboard = async (req, res, next) => {
  try {
    const employee = await prisma.employee.findFirst({
      where: { user: { id: req.user.id } },
      include: {
        department: { select: { name: true, color: true } },
        manager: { select: { name: true, profileImage: true } }
      }
    });

    if (!employee) return res.status(404).json({ success: false, message: 'Employee profile not found' });

    const today = moment().startOf('day').toDate();
    const monthStart = moment().startOf('month').toDate();

    const [todayAttendance, monthAttendance, pendingTasks, recentLeaves, latestPayroll] = await Promise.all([
      prisma.attendance.findFirst({ where: { employeeId: employee.id, date: today } }),
      prisma.attendance.findMany({ where: { employeeId: employee.id, date: { gte: monthStart } } }),
      prisma.task.findMany({ where: { assigneeId: employee.id, status: { not: 'Completed' } }, take: 5, orderBy: { deadline: 'asc' } }),
      prisma.leave.findMany({ where: { employeeId: employee.id }, take: 5, orderBy: { createdAt: 'desc' } }),
      prisma.payroll.findFirst({ where: { employeeId: employee.id }, orderBy: [{ year: 'desc' }, { month: 'desc' }] })
    ]);

    res.status(200).json({
      success: true,
      data: {
        employee,
        todayAttendance,
        monthStats: {
          present: monthAttendance.filter(a => a.status === 'Present').length,
          late: monthAttendance.filter(a => a.isLate).length,
          absent: monthAttendance.filter(a => a.status === 'Absent').length
        },
        pendingTasks,
        recentLeaves,
        latestPayroll,
        leaveBalance: employee.leaveBalance
      }
    });
  } catch (error) { next(error); }
};

// Export reports as Excel
export const exportExcel = async (req, res, next) => {
  try {
    const { type, month, year } = req.query;
    const companyId = req.user.companyId;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(type);

    const headerStyle = { font: { bold: true, color: { argb: 'FFFFFFFF' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366F1' } }, alignment: { horizontal: 'center' } };

    if (type === 'employees') {
      sheet.columns = [
        { header: 'Employee ID', key: 'id', width: 15 },
        { header: 'Name', key: 'name', width: 25 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Department', key: 'dept', width: 20 },
        { header: 'Designation', key: 'designation', width: 20 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Joining Date', key: 'joining', width: 15 }
      ];
      sheet.getRow(1).eachCell(cell => { cell.style = headerStyle; });

      const employees = await prisma.employee.findMany({
        where: { companyId },
        include: { department: { select: { name: true } } }
      });
      employees.forEach(e => sheet.addRow({
        id: e.employeeCode, name: e.name, email: e.email,
        dept: e.department?.name || 'N/A', designation: e.designation,
        status: e.status, joining: moment(e.joiningDate).format('DD/MM/YYYY')
      }));
    } else if (type === 'payroll') {
      sheet.columns = [
        { header: 'Employee', key: 'name', width: 25 },
        { header: 'Month', key: 'month', width: 10 },
        { header: 'Year', key: 'year', width: 10 },
        { header: 'Basic', key: 'basic', width: 12 },
        { header: 'Gross', key: 'gross', width: 12 },
        { header: 'Deductions', key: 'deductions', width: 12 },
        { header: 'Net Salary', key: 'net', width: 12 },
        { header: 'Status', key: 'status', width: 12 }
      ];
      sheet.getRow(1).eachCell(cell => { cell.style = headerStyle; });

      const where = { companyId };
      if (month) where.month = parseInt(month);
      if (year) where.year = parseInt(year);
      const payrolls = await prisma.payroll.findMany({
        where,
        include: { employee: { select: { name: true } } }
      });
      payrolls.forEach(p => sheet.addRow({
        name: p.employee?.name, month: p.month, year: p.year,
        basic: p.basicSalary, gross: p.grossSalary, deductions: p.totalDeductions,
        net: p.netSalary, status: p.status
      }));
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${type}-report-${Date.now()}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) { next(error); }
};

export const exportPDF = async (req, res, next) => {
  try {
    const { type } = req.query;
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${type}-report-${Date.now()}.pdf`);
    doc.pipe(res);

    doc.fontSize(20).fillColor('#6366f1').text('HRMS Report', { align: 'center' });
    doc.fontSize(12).fillColor('#333').text(`Type: ${type}`, { align: 'center' });
    doc.text(`Generated: ${moment().format('DD MMM YYYY, HH:mm')}`, { align: 'center' });
    doc.moveDown(2);
    doc.text('Data exported successfully. Please view the detailed report in the application.', { align: 'center' });

    doc.end();
  } catch (error) { next(error); }
};
