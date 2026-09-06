import prisma from '../config/prisma.js';
import moment from 'moment';

/**
 * Rule-based HR Chatbot - No external AI APIs
 * Fetches real data from PostgreSQL via Prisma based on intent detection
 */

const INTENTS = [
  { patterns: ['leave balance', 'remaining leave', 'how many leaves', 'leave left', 'my leaves'], intent: 'leave_balance' },
  { patterns: ['my attendance', 'attendance today', 'check attendance', 'present days', 'working hours'], intent: 'attendance' },
  { patterns: ['my salary', 'salary details', 'payslip', 'net salary', 'how much salary'], intent: 'salary' },
  { patterns: ['my tasks', 'pending tasks', 'assigned tasks', 'task list'], intent: 'tasks' },
  { patterns: ['company holidays', 'public holidays', 'holiday list', 'upcoming holidays'], intent: 'holidays' },
  { patterns: ['hello', 'hi', 'hey', 'good morning', 'good afternoon'], intent: 'greeting' },
  { patterns: ['help', 'what can you do', 'commands', 'options', 'menu'], intent: 'help' },
  { patterns: ['check in', 'check out', 'mark attendance'], intent: 'attendance_action' },
  { patterns: ['apply leave', 'request leave', 'take leave'], intent: 'apply_leave' },
  { patterns: ['who is my manager', 'my manager', 'reporting to'], intent: 'manager_info' }
];

const detectIntent = (message) => {
  const lower = message.toLowerCase();
  for (const { patterns, intent } of INTENTS) {
    if (patterns.some(p => lower.includes(p))) return intent;
  }
  return 'unknown';
};

export const chatbotQuery = async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'Message is required' });

    const intent = detectIntent(message);
    const employee = await prisma.employee.findFirst({
      where: { user: { id: req.user.id } },
      include: {
        department: { select: { name: true } },
        manager: { select: { name: true, email: true } }
      }
    });

    let response = '';
    let data = null;

    switch (intent) {
      case 'greeting':
        response = `Hello ${req.user.name}! 👋 I'm your HR Assistant. How can I help you today? Type "help" to see what I can do.`;
        break;

      case 'help':
        response = `I can help you with:\n• **Leave Balance** - "What is my leave balance?"\n• **Attendance** - "Show my attendance"\n• **Salary** - "What is my salary?"\n• **Tasks** - "Show my pending tasks"\n• **Holidays** - "List company holidays"\n• **Manager** - "Who is my manager?"`;
        break;

      case 'leave_balance':
        if (!employee) {
          response = 'Your employee profile is not set up yet. Please contact HR.';
        } else {
          const leaveBalance = employee.leaveBalance || {};
          response = `📋 **Your Leave Balance:**\n• Sick Leave: **${leaveBalance.sick || 0} days**\n• Casual Leave: **${leaveBalance.casual || 0} days**\n• Annual Leave: **${leaveBalance.annual || 0} days**\n• Emergency Leave: **${leaveBalance.emergency || 0} days**`;
          data = leaveBalance;
        }
        break;

      case 'attendance': {
        const today = moment().startOf('day').toDate();
        const monthStart = moment().startOf('month').toDate();
        const monthEnd = moment().endOf('month').toDate();

        const todayRecord = employee ? await prisma.attendance.findFirst({
          where: { employeeId: employee.id, date: today }
        }) : null;

        const monthRecords = employee ? await prisma.attendance.findMany({
          where: {
            employeeId: employee.id,
            date: { gte: monthStart, lte: monthEnd }
          }
        }) : [];

        const present = monthRecords.filter(r => r.status === 'Present' || r.status === 'Late').length;
        const late = monthRecords.filter(r => r.isLate).length;

        let todayStatus = todayRecord
          ? `✅ Checked in at ${moment(todayRecord.checkIn).format('HH:mm')}${todayRecord.checkOut ? `, checked out at ${moment(todayRecord.checkOut).format('HH:mm')}` : ' (still working)'}`
          : '❌ No check-in recorded today';

        response = `📊 **Your Attendance:**\n**Today:** ${todayStatus}\n\n**This Month:**\n• Present Days: ${present}\n• Late Arrivals: ${late}\n• On Leave: ${monthRecords.filter(r => r.status === 'OnLeave').length}`;
        data = { today: todayRecord, monthStats: { present, late } };
        break;
      }

      case 'salary': {
        const latestPayroll = employee ? await prisma.payroll.findFirst({
          where: { employeeId: employee.id },
          orderBy: [{ year: 'desc' }, { month: 'desc' }]
        }) : null;

        if (!latestPayroll) {
          response = '💰 No payroll records found yet. Please contact HR.';
        } else {
          response = `💰 **Latest Salary (${latestPayroll.month}/${latestPayroll.year}):**\n• Basic: ${latestPayroll.basicSalary} ${latestPayroll.currency}\n• Gross: ${latestPayroll.grossSalary} ${latestPayroll.currency}\n• Deductions: ${latestPayroll.totalDeductions} ${latestPayroll.currency}\n• **Net Salary: ${latestPayroll.netSalary} ${latestPayroll.currency}**\n• Status: ${latestPayroll.status}`;
          data = latestPayroll;
        }
        break;
      }

      case 'tasks': {
        const tasks = employee ? await prisma.task.findMany({
          where: {
            assigneeId: employee.id,
            status: { not: 'Completed' }
          },
          orderBy: [{ priority: 'asc' }, { deadline: 'asc' }],
          take: 5
        }) : [];

        if (!tasks.length) {
          response = '✅ You have no pending tasks at the moment!';
        } else {
          const taskList = tasks.map(t => `• **${t.title}** (${t.status}) - Priority: ${t.priority}${t.deadline ? ` - Due: ${moment(t.deadline).format('DD MMM')}` : ''}`).join('\n');
          response = `📝 **Your Pending Tasks (${tasks.length}):**\n${taskList}`;
          data = tasks;
        }
        break;
      }

      case 'holidays':
        response = `🗓️ **Company Holidays:**\n• Jan 1 - New Year's Day\n• May 1 - Labor Day\n• Dec 25 - Christmas Day\n\nFor the full holiday list, check the Announcements section.`;
        break;

      case 'attendance_action':
        response = `To mark attendance, go to the **Attendance** section in your dashboard, or scan the QR code if available.`;
        break;

      case 'apply_leave': {
        const leaveBalance = employee?.leaveBalance || {};
        response = `To apply for leave, go to **My Leaves** > **Apply Leave**. Your current balance:\n• Sick: ${leaveBalance.sick || 0} days\n• Casual: ${leaveBalance.casual || 0} days\n• Annual: ${leaveBalance.annual || 0} days`;
        break;
      }

      case 'manager_info':
        if (employee?.manager) {
          response = `👤 **Your Manager:** ${employee.manager.name}\n📧 Email: ${employee.manager.email}`;
        } else {
          response = "You don't have a manager assigned yet. Contact HR.";
        }
        break;

      default:
        response = `I'm sorry, I didn't understand that. Type "help" to see what I can assist with. 🤖`;
    }

    res.status(200).json({ success: true, data: { intent, response, data } });
  } catch (error) {
    next(error);
  }
};
