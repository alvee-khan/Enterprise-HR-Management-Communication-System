/**
 * CSE447 Security & Cryptography / HRMS
 * Bangladeshi Context Complete Feature Data Feeder
 * 
 * Feeds 5-6 realistic items for EVERY feature across EVERY company:
 * - Company settings (BDT, Asia/Dhaka, Sunday-Thursday, Dhaka addresses)
 * - Departments (Engineering, HR, QA, Product, Finance, Sales)
 * - Employees & Users (Bangladeshi names, RSA encrypted salary & bank details, HMAC tags)
 * - Attendance records (Working days, check-in/out, Dhaka coordinates)
 * - Leave applications (Authentic Bangladeshi reasons, status, security tags)
 * - Payroll history (BDT monthly pay slips, allowances, PF, tax deductions)
 * - Projects (bKash/Nagad FinTech, NBR automation, Citizen portals)
 * - Tasks (Kanban items, priorities, deadlines)
 * - Jobs (Dhaka/Chittagong/Remote openings, BDT salary ranges)
 * - Candidates (Bangladeshi applicants, BUET/DU/BRACU/NSU resumes, pipeline)
 * - Performance Reviews (Quarterly & annual reviews with scores & goals)
 * - Documents (TIN certificates, NID scans, contracts, offer letters with HMAC)
 * - Announcements (Eid holidays, bonuses, townhall, health insurance)
 * - Internal Posts (ECC ElGamal encrypted titles & content, signed with ECDSA)
 */

import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import moment from 'moment';
import crypto from 'crypto';
import prisma from '../config/prisma.js';
import { encryptEmployeeProfile, eccEncryptField, getOrInitializeSystemECCKey, getOrInitializeSystemRSAKey } from '../security/encryption/encryptionService.js';
import { generateMAC } from '../security/mac/generateMAC.js';
import { generateSalt, hashPasswordWithSalt } from '../security/authentication/passwordHashing.js';
import { generateECCKeyPair } from '../security/ecc/eccKeyGeneration.js';
import { signMessage } from '../security/ecc/digitalSignature.js';
import { getUnwrappedPrivateKey } from '../security/keyManagement/keyStorage.js';

dotenv.config();

// Standard Bangladeshi department blueprints
const DEPARTMENTS_DATA = [
  { name: 'Software Engineering', code: 'ENG', description: 'Core product architecture, cloud backend, and frontend web development.', color: '#3b82f6' },
  { name: 'Human Resources & Culture', code: 'HRC', description: 'Talent acquisition, employee welfare, Bangladesh Labor Act compliance, and payroll.', color: '#ec4899' },
  { name: 'Quality Assurance & Security', code: 'QAS', description: 'Automated testing, penetration testing, performance benchmarking, and security audits.', color: '#10b981' },
  { name: 'Product Management & UI/UX', code: 'PRD', description: 'User experience research, design systems, and product roadmaps.', color: '#8b5cf6' },
  { name: 'Finance, Tax & Accounts', code: 'FIN', description: 'Corporate financial planning, NBR tax filings, audits, and vendor disbursements.', color: '#f59e0b' },
  { name: 'Sales & Strategic Partnerships', code: 'SSP', description: 'B2B enterprise client acquisition, government tenders, and strategic merchant relations.', color: '#06b6d4' }
];

// Reusable pool of realistic Bangladeshi employee personas
const EMPLOYEE_PERSONAS = [
  {
    name: 'Tanvir Ahmed',
    gender: 'Male',
    designation: 'Principal Solutions Architect',
    deptIndex: 0,
    basicSalary: 145000,
    phone: '+880 1711-234567',
    street: 'Road 11, Block D, Banani',
    city: 'Dhaka',
    bank: 'BRAC Bank PLC',
    acc: '1501204567890',
    branch: 'Banani Branch',
    skills: [{ name: 'System Architecture', level: 96 }, { name: 'Node.js & Go', level: 92 }, { name: 'PostgreSQL', level: 94 }, { name: 'AWS Cloud', level: 90 }],
    education: [{ degree: 'B.Sc. in CSE', institution: 'BUET', year: 2015 }]
  },
  {
    name: 'Nusrat Jahan',
    gender: 'Female',
    designation: 'Senior HR Business Partner',
    deptIndex: 1,
    basicSalary: 85000,
    phone: '+880 1812-345678',
    street: 'House 24, Road 7, Dhanmondi',
    city: 'Dhaka',
    bank: 'Eastern Bank PLC (EBL)',
    acc: '1101987654321',
    branch: 'Dhanmondi Branch',
    skills: [{ name: 'Talent Acquisition', level: 95 }, { name: 'Labor Law Compliance', level: 92 }, { name: 'Employee Relations', level: 90 }],
    education: [{ degree: 'BBA in HRM', institution: 'North South University (NSU)', year: 2017 }]
  },
  {
    name: 'Rafiqul Islam',
    gender: 'Male',
    designation: 'Lead SQA Automation Engineer',
    deptIndex: 2,
    basicSalary: 95000,
    phone: '+880 1913-456789',
    street: 'Flat 4B, Sector 4, Uttara',
    city: 'Dhaka',
    bank: 'Dutch-Bangla Bank PLC',
    acc: '1071567890123',
    branch: 'Uttara Branch',
    skills: [{ name: 'Cypress & Playwright', level: 94 }, { name: 'API Security Testing', level: 90 }, { name: 'CI/CD Pipelines', level: 88 }],
    education: [{ degree: 'B.Sc. in Software Engineering', institution: 'IIT, University of Dhaka', year: 2018 }]
  },
  {
    name: 'Anika Tabassum',
    gender: 'Female',
    designation: 'Lead Product & UI/UX Designer',
    deptIndex: 3,
    basicSalary: 92000,
    phone: '+880 1614-567890',
    street: 'House 15, Road 3, Mirpur DOHS',
    city: 'Dhaka',
    bank: 'City Bank PLC',
    acc: '2201456789012',
    branch: 'Mirpur Branch',
    skills: [{ name: 'Figma Design Systems', level: 98 }, { name: 'Bangla Typography & UX', level: 95 }, { name: 'Mobile App Wireframing', level: 92 }],
    education: [{ degree: 'BFA in Graphic Design', institution: 'Faculty of Fine Arts, University of Dhaka', year: 2017 }]
  },
  {
    name: 'Mahmudul Hasan',
    gender: 'Male',
    designation: 'Corporate Accounts & Tax Manager',
    deptIndex: 4,
    basicSalary: 98000,
    phone: '+880 1715-678901',
    street: 'Lane 2, Block C, Bashundhara R/A',
    city: 'Dhaka',
    bank: 'Islami Bank Bangladesh PLC',
    acc: '2050304567890',
    branch: 'Gulshan Branch',
    skills: [{ name: 'NBR Corporate Tax', level: 96 }, { name: 'Financial Modeling', level: 92 }, { name: 'Audit & Compliance', level: 90 }],
    education: [{ degree: 'M.Com in Accounting & CMA Inter', institution: 'University of Dhaka', year: 2016 }]
  },
  {
    name: 'Farhana Akter',
    gender: 'Female',
    designation: 'Senior Enterprise Sales Executive',
    deptIndex: 5,
    basicSalary: 82000,
    phone: '+880 1816-789012',
    street: 'Plot 78, Road 11, Gulshan-1',
    city: 'Dhaka',
    bank: 'Mutual Trust Bank PLC',
    acc: '3301567890123',
    branch: 'Gulshan Branch',
    skills: [{ name: 'B2B Solution Sales', level: 94 }, { name: 'Key Account Management', level: 92 }, { name: 'Strategic Negotiation', level: 90 }],
    education: [{ degree: 'BBA in Marketing', institution: 'BRAC University', year: 2019 }]
  }
];

export async function feedAllFeaturesBangladeshi() {
  console.log('🚀 Starting Bangladeshi Context Data Feeder for All Companies...');
  await prisma.$connect();

  // 1. Fetch all companies
  const companies = await prisma.company.findMany({
    include: {
      admin: true
    }
  });

  if (companies.length === 0) {
    console.log('❌ No companies found in database!');
    return;
  }

  console.log(`🏢 Found ${companies.length} companies to enrich with Bangladeshi data:`, companies.map(c => `${c.id}: ${c.name}`).join(', '));

  const salt = await bcrypt.genSalt(10);
  const defaultPasswordHash = await bcrypt.hash('password123', salt);

  // Iterate over each company
  for (const company of companies) {
    console.log(`\n======================================================`);
    console.log(`⚙️ Processing Company [ID: ${company.id}] "${company.name}"...`);

    // A. Update Company Profile with authentic Bangladeshi info
    const updatedCompany = await prisma.company.update({
      where: { id: company.id },
      data: {
        phone: company.phone || '+880 2 9882200',
        website: company.website || `https://${company.slug || 'company'}.com.bd`,
        address: company.address || {
          street: 'Level 8, Concord Baksh Tower, Gulshan-2',
          city: 'Dhaka',
          state: 'Dhaka Division',
          country: 'Bangladesh',
          zipCode: '1212'
        },
        settings: {
          currency: 'BDT',
          timezone: 'Asia/Dhaka',
          workingHours: { start: '09:00', end: '18:00' },
          workingDays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
          leaveBalance: { sick: 12, casual: 12, annual: 18, emergency: 3 }
        },
        description: company.description || 'Enterprise Technology & Business Solutions company based in Dhaka, Bangladesh.'
      }
    });

    // B. Ensure 6 Departments
    const companyDepts = [];
    for (const d of DEPARTMENTS_DATA) {
      let dept = await prisma.department.findFirst({
        where: { companyId: company.id, name: d.name }
      });
      if (!dept) {
        dept = await prisma.department.create({
          data: {
            name: d.name,
            code: d.code,
            companyId: company.id,
            description: d.description,
            color: d.color,
            budget: 1500000,
            location: 'Dhaka HQ'
          }
        });
      }
      companyDepts.push(dept);
    }
    console.log(`  ✅ 6 Departments verified for ${company.name}`);

    // C. Ensure 6 Employees & Users
    const companyEmployees = [];
    let empIndex = 1;

    for (const persona of EMPLOYEE_PERSONAS) {
      const emailDomain = company.slug ? `${company.slug}.com.bd` : 'digibangla.com.bd';
      const cleanName = persona.name.toLowerCase().replace(/[^a-z]/g, '');
      const email = `${cleanName}.${company.id}@${emailDomain}`;

      // Check if employee exists
      let emp = await prisma.employee.findFirst({
        where: { companyId: company.id, email }
      });

      if (!emp) {
        // Create user first
        const userSalt = generateSalt(16);
        const { hash: userHash } = hashPasswordWithSalt('password123', userSalt);
        const userEccKeys = generateECCKeyPair();

        const user = await prisma.user.create({
          data: {
            name: persona.name,
            email,
            password: defaultPasswordHash,
            password_salt: userSalt,
            role: persona.deptIndex === 0 ? 'manager' : persona.deptIndex === 1 ? 'hrManager' : 'employee',
            companyId: company.id,
            phone: persona.phone,
            isActive: true,
            ecc_public_key: JSON.stringify(userEccKeys.publicKey),
            security_version: 2
          }
        });

        const empCode = `EMP-${String(company.id).padStart(2, '0')}${String(empIndex).padStart(2, '0')}`;
        const targetDept = companyDepts[persona.deptIndex] || companyDepts[0];

        const rawEmpPayload = {
          companyId: company.id,
          employeeCode: empCode,
          name: persona.name,
          email,
          phone: persona.phone,
          profileImage: '',
          gender: persona.gender,
          dateOfBirth: new Date('1992-05-15'),
          address: {
            street: persona.street,
            city: persona.city,
            country: 'Bangladesh',
            zipCode: '1200'
          },
          departmentId: targetDept.id,
          designation: persona.designation,
          joiningDate: new Date('2023-01-15'),
          employmentType: 'FullTime',
          status: 'Active',
          salary: {
            basic: persona.basicSalary,
            houseRent: Math.round(persona.basicSalary * 0.5),
            medical: Math.round(persona.basicSalary * 0.1),
            conveyance: 10000,
            currency: 'BDT'
          },
          bankDetails: {
            bankName: persona.bank,
            accountNumber: persona.acc,
            branchName: persona.branch,
            routingNumber: '125261000'
          },
          emergencyContact: {
            name: 'Family Contact',
            relation: 'Spouse/Parent',
            phone: '+880 1700-000000'
          },
          skills: persona.skills,
          education: persona.education,
          leaveBalance: { sick: 12, casual: 12, annual: 18, emergency: 3 },
          notes: 'Verified Smart NID & TIN. Active in Dhaka office.'
        };

        const securedPayload = await encryptEmployeeProfile(rawEmpPayload);
        emp = await prisma.employee.create({
          data: securedPayload
        });

        // Link User to EmployeeProfile
        await prisma.user.update({
          where: { id: user.id },
          data: { employeeProfileId: emp.id }
        });
      }

      companyEmployees.push(emp);
      empIndex++;
    }
    console.log(`  ✅ 6 Employees with RSA encryption verified for ${company.name}`);

    // D. Seed 5-6 Attendance Records per Employee
    const existingAttendanceCount = await prisma.attendance.count({ where: { companyId: company.id } });
    if (existingAttendanceCount < 20) {
      const attendanceEntries = [];
      const pastDays = [1, 2, 3, 4, 5, 6];

      for (const emp of companyEmployees) {
        const user = await prisma.user.findFirst({ where: { employeeProfileId: emp.id } });
        const userId = user?.id || company.adminId;

        for (const daysAgo of pastDays) {
          const checkDate = moment().subtract(daysAgo, 'days').startOf('day');
          // Skip Fridays and Saturdays (Bangladesh weekend)
          if (checkDate.day() === 5 || checkDate.day() === 6) continue;

          const checkIn = moment(checkDate).hour(8).minute(50 + Math.floor(Math.random() * 25)).toDate();
          const checkOut = moment(checkDate).hour(18).minute(5 + Math.floor(Math.random() * 25)).toDate();
          const isLate = checkIn.getMinutes() > 10 && checkIn.getHours() >= 9;

          attendanceEntries.push({
            companyId: company.id,
            employeeId: emp.id,
            userId,
            date: checkDate.toDate(),
            checkIn,
            checkOut,
            workingHours: 540,
            status: isLate ? 'Late' : 'Present',
            isLate,
            lateMinutes: isLate ? 15 : 0,
            checkInMethod: 'web',
            location: {
              checkIn: { lat: 23.7925, lng: 90.4078, address: 'Gulshan-2 Office, Dhaka' },
              checkOut: { lat: 23.7925, lng: 90.4078, address: 'Gulshan-2 Office, Dhaka' }
            }
          });
        }
      }

      for (const att of attendanceEntries) {
        try {
          await prisma.attendance.upsert({
            where: {
              companyId_employeeId_date: {
                companyId: att.companyId,
                employeeId: att.employeeId,
                date: att.date
              }
            },
            update: {},
            create: att
          });
        } catch {}
      }
      console.log(`  ✅ Attendance records seeded for ${company.name}`);
    }

    // E. Seed 5-6 Leaves per Company
    const existingLeaves = await prisma.leave.count({ where: { companyId: company.id } });
    if (existingLeaves < 5) {
      const leaveReasons = [
        { type: 'Casual', days: 2, reason: "Sister's wedding ceremony in Sylhet Sadar.", status: 'Approved' },
        { type: 'Sick', days: 3, reason: 'Severe seasonal viral fever and medical treatment at Square Hospital.', status: 'Approved' },
        { type: 'Annual', days: 4, reason: 'Eid-ul-Fitr family visit to native village in Rajshahi.', status: 'Approved' },
        { type: 'Casual', days: 1, reason: 'Land registry and mutation formalities at Dhaka Sub-Registry Office.', status: 'Pending' },
        { type: 'Emergency', days: 2, reason: 'Mother admitted to Bangladesh Eye Hospital for scheduled cataract surgery.', status: 'Approved' },
        { type: 'Sick', days: 1, reason: 'Dental appointment and root canal procedure in Dhanmondi.', status: 'Pending' }
      ];

      for (let i = 0; i < leaveReasons.length; i++) {
        const item = leaveReasons[i];
        const emp = companyEmployees[i % companyEmployees.length];
        const user = await prisma.user.findFirst({ where: { employeeProfileId: emp.id } });
        const userId = user?.id || company.adminId;

        const startDate = moment().add(i * 3, 'days').toDate();
        const endDate = moment(startDate).add(item.days - 1, 'days').toDate();

        await prisma.leave.create({
          data: {
            employeeId: emp.id,
            userId,
            companyId: company.id,
            type: item.type,
            startDate,
            endDate,
            totalDays: item.days,
            reason: item.reason,
            status: item.status,
            approvedById: item.status === 'Approved' ? company.adminId : null,
            approvedAt: item.status === 'Approved' ? new Date() : null,
            mac_value: generateMAC(item.reason)
          }
        });
      }
      console.log(`  ✅ 6 Leave requests seeded with Bangladeshi reasons for ${company.name}`);
    }

    // F. Seed 5-6 Payroll Records per Company
    const existingPayrolls = await prisma.payroll.count({ where: { companyId: company.id } });
    if (existingPayrolls < 5) {
      const payrollBatches = [];
      const months = [7, 8]; // July, August 2026

      for (let i = 0; i < companyEmployees.length; i++) {
        const emp = companyEmployees[i];
        const persona = EMPLOYEE_PERSONAS[i];
        const basic = persona.basicSalary;
        const allowances = [
          { name: 'House Rent (50%)', amount: Math.round(basic * 0.5) },
          { name: 'Medical Allowance', amount: Math.round(basic * 0.1) },
          { name: 'Conveyance', amount: 8000 }
        ];
        const deductions = [
          { name: 'Provident Fund (10%)', amount: Math.round(basic * 0.1) },
          { name: 'Income Tax (NBR)', amount: Math.round(basic * 0.05) }
        ];
        const totalAllowances = allowances.reduce((s, a) => s + a.amount, 0);
        const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0);
        const grossSalary = basic + totalAllowances;
        const netSalary = grossSalary - totalDeductions;

        for (const m of months) {
          const payrollHash = crypto.createHash('sha256').update(`${company.id}-${emp.id}-${m}-2026-${netSalary}`).digest('hex');
          payrollBatches.push({
            employeeId: emp.id,
            companyId: company.id,
            month: m,
            year: 2026,
            basicSalary: basic,
            allowances,
            bonuses: m === 8 ? [{ name: 'Eid Festival Bonus', amount: Math.round(basic * 0.5) }] : [],
            deductions,
            tax: Math.round(basic * 0.05),
            totalAllowances,
            totalBonuses: m === 8 ? Math.round(basic * 0.5) : 0,
            totalDeductions,
            grossSalary: grossSalary + (m === 8 ? Math.round(basic * 0.5) : 0),
            netSalary: netSalary + (m === 8 ? Math.round(basic * 0.5) : 0),
            currency: 'BDT',
            status: 'Paid',
            paymentDate: new Date(2026, m - 1, 28),
            paymentMethod: 'BankTransfer',
            workingDays: 22,
            presentDays: 22,
            paidById: company.adminId,
            generatedById: company.adminId,
            integrity_hash: payrollHash,
            mac_value: generateMAC(payrollHash),
            notes: 'Disbursed through Bangladesh Electronic Funds Transfer Network (BEFTN)'
          });
        }
      }

      for (const p of payrollBatches) {
        try {
          await prisma.payroll.upsert({
            where: {
              companyId_employeeId_month_year: {
                companyId: p.companyId,
                employeeId: p.employeeId,
                month: p.month,
                year: p.year
              }
            },
            update: {},
            create: p
          });
        } catch {}
      }
      console.log(`  ✅ Monthly BDT Payroll slips seeded for ${company.name}`);
    }

    // G. Seed 5-6 Projects per Company
    const existingProjects = await prisma.project.count({ where: { companyId: company.id } });
    let createdProjects = [];
    if (existingProjects < 5) {
      const projectTemplates = [
        {
          name: 'bKash & Nagad Tokenized Payment Gateway',
          description: 'High-volume MFS tokenized checkout gateway with automatic IPN reconciliation and instant merchant settlement.',
          budget: 3500000, progress: 85, color: '#ec4899', priority: 'Critical', status: 'Active',
          tags: ['bKash', 'Nagad', 'MFS', 'FinTech', 'PostgreSQL']
        },
        {
          name: 'BanglaNLP Legal & Regulatory Assistant',
          description: 'Bangla LLM chatbot specialized in Bangladesh Labor Act 2006, tax regulations, and company policy queries.',
          budget: 2800000, progress: 65, color: '#8b5cf6', priority: 'High', status: 'Active',
          tags: ['BanglaNLP', 'AI', 'LaborAct', 'Transformers', 'FastAPI']
        },
        {
          name: 'Dhaka Metro Rail Smart Commuter App',
          description: 'MRT line ticketing, rapid pass recharge via bKash/Card, and live train arrival scheduling.',
          budget: 4200000, progress: 45, color: '#10b981', priority: 'High', status: 'Active',
          tags: ['MetroRail', 'React Native', 'QR Ticketing', 'SmartCity']
        },
        {
          name: 'National NBR E-TDS & VAT Automation Portal',
          description: 'Automated corporate tax withholding deduction certificate generation and monthly NBR VAT return filing.',
          budget: 2000000, progress: 90, color: '#3b82f6', priority: 'Medium', status: 'Active',
          tags: ['NBR', 'Taxation', 'VAT', 'E-TDS', 'Compliance']
        },
        {
          name: 'Chittagong Port Maritime Cargo Tracker',
          description: 'Container tracking and customs clearance workflow suite for C&F agents and freight forwarders.',
          budget: 5000000, progress: 30, color: '#06b6d4', priority: 'High', status: 'Planning',
          tags: ['ChittagongPort', 'Customs', 'Logistics', 'SupplyChain']
        },
        {
          name: 'Rural Agent Banking POS Terminal System',
          description: 'Lightweight biometric offline POS terminal application for rural union parishad digital centers.',
          budget: 3200000, progress: 20, color: '#f59e0b', priority: 'Medium', status: 'Planning',
          tags: ['AgentBanking', 'FinancialInclusion', 'Microfinance']
        }
      ];

      for (let i = 0; i < projectTemplates.length; i++) {
        const pt = projectTemplates[i];
        const proj = await prisma.project.create({
          data: {
            companyId: company.id,
            name: pt.name,
            description: pt.description,
            budget: pt.budget,
            progress: pt.progress,
            color: pt.color,
            priority: pt.priority,
            status: pt.status,
            tags: pt.tags,
            managerId: companyEmployees[0].id,
            startDate: moment().subtract(2, 'months').toDate(),
            endDate: moment().add(4, 'months').toDate(),
            members: {
              create: [
                { employeeId: companyEmployees[0].id },
                { employeeId: companyEmployees[1].id },
                { employeeId: companyEmployees[2].id }
              ]
            }
          }
        });
        createdProjects.push(proj);
      }
      console.log(`  ✅ 6 Projects created for ${company.name}`);
    } else {
      createdProjects = await prisma.project.findMany({ where: { companyId: company.id } });
    }

    // H. Seed 5-6 Tasks per Company
    const existingTasks = await prisma.task.count({ where: { companyId: company.id } });
    if (existingTasks < 5) {
      const taskTemplates = [
        {
          title: 'Implement bKash Tokenized Checkout API & IPN Validator',
          description: 'Setup token generation, execute agreement, and verify payment notification signatures.',
          status: 'Completed', priority: 'Urgent',
          tags: ['Payments', 'bKash', 'Security']
        },
        {
          title: 'Integrate Porichoy Smart NID Biometric Verification',
          description: 'Connect to Porichoy gateway for automated national identity verification of new employees and clients.',
          status: 'InProgress', priority: 'High',
          tags: ['NID', 'KYC', 'Security']
        },
        {
          title: 'Bangla Unicode Font Normalization & SolaimanLipi Rendering',
          description: 'Ensure accurate zero-width joiner rendering across PDF payslips and web certificates.',
          status: 'Review', priority: 'Medium',
          tags: ['Bangla', 'i18n', 'Frontend']
        },
        {
          title: 'Automated Load Testing with 10,000 Concurrent Tax Filings',
          description: 'Simulate high-concurrency peak load on NBR VAT submission endpoints using k6.',
          status: 'Todo', priority: 'High',
          tags: ['QA', 'Performance', 'Testing']
        },
        {
          title: 'PostgreSQL Point-in-Time Backup & SSL Encryption Configuration',
          description: 'Setup automated daily snapshots, multi-AZ failover, and TLS 1.3 encryption on database cluster.',
          status: 'Completed', priority: 'Urgent',
          tags: ['DevOps', 'PostgreSQL', 'AWS']
        },
        {
          title: 'Bangladesh Cyber Security Act 2023 Compliance Review',
          description: 'Document zero-trust cryptographic mechanisms and RSA data encryption policies for audit submission.',
          status: 'InProgress', priority: 'High',
          tags: ['Audit', 'Legal', 'Security']
        }
      ];

      for (let i = 0; i < taskTemplates.length; i++) {
        const tt = taskTemplates[i];
        const proj = createdProjects[i % createdProjects.length];
        const assignee = companyEmployees[i % companyEmployees.length];

        await prisma.task.create({
          data: {
            companyId: company.id,
            projectId: proj?.id,
            title: tt.title,
            description: tt.description,
            status: tt.status,
            priority: tt.priority,
            tags: tt.tags,
            assigneeId: assignee.id,
            assignedById: company.adminId,
            deadline: moment().add(i + 2, 'days').toDate(),
            position: i
          }
        });
      }
      console.log(`  ✅ 6 Tasks created for ${company.name}`);
    }

    // I. Seed 5-6 Job Openings
    const existingJobs = await prisma.job.count({ where: { companyId: company.id } });
    let createdJobs = [];
    if (existingJobs < 5) {
      const jobTemplates = [
        {
          title: 'Senior Full-Stack Node.js & React Engineer',
          deptIndex: 0,
          location: 'Gulshan-2, Dhaka',
          salary: { min: 90000, max: 140000, currency: 'BDT' },
          description: 'Looking for an experienced engineer to architect high-throughput FinTech and portal applications.',
          skills: ['Node.js', 'React.js', 'PostgreSQL', 'TypeScript', 'Docker']
        },
        {
          title: 'DevOps & Cloud Infrastructure Lead',
          deptIndex: 0,
          location: 'Banani, Dhaka',
          salary: { min: 110000, max: 160000, currency: 'BDT' },
          description: 'Lead cloud infrastructure deployment, AWS/Kubernetes scaling, and zero-trust security postures.',
          skills: ['AWS', 'Kubernetes', 'Terraform', 'CI/CD', 'Security']
        },
        {
          title: 'Software Quality Assurance (SQA) Automation Engineer',
          deptIndex: 2,
          location: 'Dhanmondi, Dhaka',
          salary: { min: 65000, max: 95000, currency: 'BDT' },
          description: 'Design end-to-end automated test suites for payment workflows and API endpoints.',
          skills: ['Playwright', 'Jest', 'Postman', 'Load Testing', 'API Testing']
        },
        {
          title: 'Talent Acquisition & HR Operations Specialist',
          deptIndex: 1,
          location: 'Gulshan-2, Dhaka',
          salary: { min: 55000, max: 80000, currency: 'BDT' },
          description: 'Drive campus recruitment, engineering hiring, and employee engagement initiatives.',
          skills: ['Talent Sourcing', 'Labor Law', 'Interviewing', 'HR Analytics']
        },
        {
          title: 'Lead UI/UX Product Designer',
          deptIndex: 3,
          location: 'Remote, Bangladesh',
          salary: { min: 80000, max: 120000, currency: 'BDT' },
          description: 'Create mobile-first, culturally aligned interfaces for millions of Bangladeshi users.',
          skills: ['Figma', 'Design Systems', 'User Research', 'Bangla Typography']
        },
        {
          title: 'Corporate Accounts & Tax Officer',
          deptIndex: 4,
          location: 'Agrabad, Chittagong',
          salary: { min: 60000, max: 85000, currency: 'BDT' },
          description: 'Manage corporate tax filings, VAT submissions, and financial reporting.',
          skills: ['NBR Tax', 'VAT 2012 Act', 'QuickBooks', 'Financial Auditing']
        }
      ];

      for (let i = 0; i < jobTemplates.length; i++) {
        const jt = jobTemplates[i];
        const dept = companyDepts[jt.deptIndex] || companyDepts[0];
        const job = await prisma.job.create({
          data: {
            companyId: company.id,
            departmentId: dept.id,
            title: jt.title,
            location: jt.location,
            salary: jt.salary,
            description: jt.description,
            requiredSkills: jt.skills,
            employmentType: 'FullTime',
            status: 'Open',
            postedById: company.adminId,
            closingDate: moment().add(30, 'days').toDate(),
            totalOpenings: 2
          }
        });
        createdJobs.push(job);
      }
      console.log(`  ✅ 6 Job Postings created for ${company.name}`);
    } else {
      createdJobs = await prisma.job.findMany({ where: { companyId: company.id } });
    }

    // J. Seed 5-6 Candidates
    const existingCandidates = await prisma.candidate.count({ where: { companyId: company.id } });
    if (existingCandidates < 5 && createdJobs.length > 0) {
      const candidatesData = [
        {
          name: 'Shakil Mahmud', email: `shakil.${company.id}@gmail.com`, phone: '+880 1718-901234',
          currentCompany: 'Pathao Ltd.', experience: 4.5, expectedSalary: 120000, status: 'Selected',
          noticePeriod: '1 Month', rating: 4.8, notes: [{ text: 'Outstanding algorithmic skills and PostgreSQL indexing knowledge.', createdAt: new Date() }]
        },
        {
          name: 'Farzana Yasmin', email: `farzana.${company.id}@gmail.com`, phone: '+880 1819-012345',
          currentCompany: 'Chaldal Inc.', experience: 3.2, expectedSalary: 85000, status: 'Interview',
          noticePeriod: 'Immediate', rating: 4.5, notes: [{ text: 'Strong expertise in Playwright automation and mobile app testing.', createdAt: new Date() }]
        },
        {
          name: 'Ariful Haque', email: `ariful.${company.id}@gmail.com`, phone: '+880 1920-123456',
          currentCompany: 'Shohoz', experience: 5.0, expectedSalary: 140000, status: 'Hired',
          noticePeriod: 'Served', rating: 4.9, notes: [{ text: 'Top candidate from BUET, demonstrated clear architectural clarity.', createdAt: new Date() }]
        },
        {
          name: 'Tahmina Sultana', email: `tahmina.${company.id}@gmail.com`, phone: '+880 1621-234567',
          currentCompany: 'Daraz Bangladesh', experience: 3.0, expectedSalary: 75000, status: 'Screening',
          noticePeriod: '15 Days', rating: 4.2, notes: [{ text: 'Great cultural fit and fluent English/Bangla corporate communication.', createdAt: new Date() }]
        },
        {
          name: 'Kazi Imtiaz Hossain', email: `imtiaz.${company.id}@gmail.com`, phone: '+880 1722-345678',
          currentCompany: 'bKash Limited', experience: 4.0, expectedSalary: 130000, status: 'Applied',
          noticePeriod: '2 Months', rating: 4.6, notes: [{ text: 'Solid Docker/K8s portfolio with AWS Solutions Architect certification.', createdAt: new Date() }]
        },
        {
          name: 'Sadia Afrin', email: `sadia.${company.id}@gmail.com`, phone: '+880 1823-456789',
          currentCompany: 'Sheba.xyz', experience: 3.8, expectedSalary: 95000, status: 'Interview',
          noticePeriod: '1 Month', rating: 4.7, notes: [{ text: 'Impressive Figma design system and mobile UI case studies.', createdAt: new Date() }]
        }
      ];

      for (let i = 0; i < candidatesData.length; i++) {
        const cd = candidatesData[i];
        const job = createdJobs[i % createdJobs.length];

        await prisma.candidate.create({
          data: {
            companyId: company.id,
            jobId: job.id,
            name: cd.name,
            email: cd.email,
            phone: cd.phone,
            currentCompany: cd.currentCompany,
            experience: cd.experience,
            expectedSalary: cd.expectedSalary,
            status: cd.status,
            noticePeriod: cd.noticePeriod,
            rating: cd.rating,
            notes: cd.notes,
            source: 'LinkedIn'
          }
        });
      }
      console.log(`  ✅ 6 Candidates created for ${company.name}`);
    }

    // K. Seed 5-6 Performance Reviews
    const existingReviews = await prisma.review.count({ where: { companyId: company.id } });
    if (existingReviews < 5) {
      for (let i = 0; i < companyEmployees.length; i++) {
        const emp = companyEmployees[i];
        const persona = EMPLOYEE_PERSONAS[i];

        await prisma.review.create({
          data: {
            employeeId: emp.id,
            reviewerId: company.adminId,
            companyId: company.id,
            period: 'Q2 2026',
            periodType: 'Quarterly',
            rating: i % 2 === 0 ? 'Excellent' : 'Good',
            overallScore: 8.5 + (i * 0.2),
            criteria: [
              { name: 'Technical Execution & Clean Code', score: 9, weight: 35 },
              { name: 'Timely Sprint Delivery', score: 8.5, weight: 25 },
              { name: 'Team Collaboration & Mentorship', score: 9, weight: 20 },
              { name: 'Bangladesh Regulatory Compliance', score: 9, weight: 20 }
            ],
            strengths: [`Outstanding dedication to ${persona.designation} duties`, 'Reliable team player with proactive communication'],
            improvements: ['Can contribute to external technical blogs and knowledge sharing sessions'],
            goals: ['Lead automated regression pipelines for Q3 releases', 'Mentor junior engineers and interns'],
            comments: `${persona.name} has demonstrated exemplary performance and reliability throughout this quarter.`,
            status: 'Acknowledged',
            employeeAcknowledged: true,
            acknowledgedAt: new Date()
          }
        });
      }
      console.log(`  ✅ 6 Performance Reviews created for ${company.name}`);
    }

    // L. Seed 5-6 Corporate & Employee Documents
    const existingDocs = await prisma.document.count({ where: { companyId: company.id } });
    if (existingDocs < 5) {
      const docTemplates = [
        { name: 'Corporate_Code_of_Conduct_and_Ethics.pdf', type: 'Other', isPublic: true },
        { name: 'Standard_Employment_Agreement_2026.pdf', type: 'Contract', isPublic: false },
        { name: 'TIN_Tax_Clearance_Certificate_NBR.pdf', type: 'Certificate', isPublic: false },
        { name: 'Smart_National_ID_Verification_Scan.pdf', type: 'ID', isPublic: false },
        { name: 'BUET_Academic_Degree_Transcript.pdf', type: 'Certificate', isPublic: false },
        { name: 'Non_Disclosure_and_Confidentiality_Agreement.pdf', type: 'Contract', isPublic: false }
      ];

      for (let i = 0; i < docTemplates.length; i++) {
        const dt = docTemplates[i];
        const emp = companyEmployees[i % companyEmployees.length];
        const docHash = crypto.createHash('sha256').update(`${company.id}-${dt.name}`).digest('hex');

        await prisma.document.create({
          data: {
            companyId: company.id,
            employeeId: emp.id,
            uploadedById: company.adminId,
            name: dt.name,
            type: dt.type,
            fileName: dt.name,
            fileUrl: `/uploads/${dt.name}`,
            fileSize: 245000,
            mimeType: 'application/pdf',
            isPublic: dt.isPublic,
            integrity_hash: docHash,
            mac_value: generateMAC(docHash)
          }
        });
      }
      console.log(`  ✅ 6 Documents seeded for ${company.name}`);
    }

    // M. Seed 5-6 Announcements
    const existingAnnouncements = await prisma.announcement.count({ where: { companyId: company.id } });
    if (existingAnnouncements < 5) {
      const announcementTemplates = [
        {
          title: 'Official Holidays on the Occasion of Eid-ul-Fitr 2026',
          content: 'The management is pleased to announce a 5-day holiday from 28th Shawwal on the auspicious occasion of Eid-ul-Fitr. Wishing you and your family Eid Mubarak!',
          type: 'Holiday', priority: 'High', isPinned: true
        },
        {
          title: 'Annual Performance Appraisal Bonus & Increment Notification',
          content: 'Annual appraisal bonuses and merit salary increments have been disbursed along with this month’s payroll via BEFTN. Please check your encrypted pay slips.',
          type: 'HR', priority: 'High', isPinned: true
        },
        {
          title: 'Annual Corporate Townhall & Dinner at Radisson Blu Dhaka',
          content: 'Join us on Friday evening at Radisson Blu Water Garden Dhaka for our annual corporate townhall, awards ceremony, and buffet dinner.',
          type: 'Event', priority: 'Medium', isPinned: false
        },
        {
          title: 'Upgraded Corporate Health & Hospitalization Insurance',
          content: 'We have renewed our corporate health coverage with Green Life Hospital and Square Hospital with increased cashless OPD and IPD benefits for all employees.',
          type: 'Policy', priority: 'Medium', isPinned: false
        },
        {
          title: 'Pohela Boishakh (Bangla New Year 1433) Office Celebration',
          content: 'Celebration of Pohela Boishakh will be held at our cafeteria featuring traditional Panta Ilish, cultural performances, and festive attire.',
          type: 'Event', priority: 'Medium', isPinned: false
        },
        {
          title: 'Updated Hybrid Workplace Guidelines (3 Days Office / 2 Days Remote)',
          content: 'Employees may choose any two days between Sunday and Thursday to work remotely upon manager approval to avoid peak Dhaka traffic hours.',
          type: 'Policy', priority: 'High', isPinned: false
        }
      ];

      for (const ann of announcementTemplates) {
        await prisma.announcement.create({
          data: {
            companyId: company.id,
            title: ann.title,
            content: ann.content,
            type: ann.type,
            priority: ann.priority,
            isPinned: ann.isPinned,
            createdById: company.adminId,
            isActive: true
          }
        });
      }
      console.log(`  ✅ 6 Announcements seeded for ${company.name}`);
    }

    // N. Seed 5-6 Internal Posts with ECC ElGamal Encryption
    const existingPosts = await prisma.post.count({ where: { companyId: company.id } });
    if (existingPosts < 5) {
      const eccMasterKey = await getOrInitializeSystemECCKey();
      const rawPrivateKey = getUnwrappedPrivateKey(eccMasterKey);
      const privateKey = rawPrivateKey ? JSON.parse(rawPrivateKey) : null;

      const postTemplates = [
        {
          title: 'Warm Welcome to our 6 New Engineers & Specialists!',
          content: 'A huge shoutout and warm welcome to our newly onboarded engineering cohort in Dhaka HQ today! Looking forward to building great products together.'
        },
        {
          title: 'Major Milestone: 100,000 Transactions on bKash Gateway!',
          content: 'Proud to announce that our bKash and Nagad payment gateway has successfully processed 100,000 transactions with 99.99% uptime and zero discrepancies.'
        },
        {
          title: 'Annual Corporate Badminton & Table Tennis Tournament Registration Open',
          content: 'Registration is now live for our inter-departmental badminton and TT tournament taking place this Saturday at Uttara Club. Sign up with HR!'
        },
        {
          title: 'Tech Talk: Asymmetric Zero-Trust Cryptography in Modern Web Apps',
          content: 'Join our principal architect Tanvir Ahmed this Thursday at 4 PM for an in-depth session on RSA key wrapping, ECC digital signatures, and data integrity.'
        },
        {
          title: 'Congratulations to QA Team on 99.8% Test Automation Coverage',
          content: 'Heartiest congratulations to our SQA cohort for delivering flawless Playwright automated test pipelines across all citizen portal modules.'
        },
        {
          title: 'Voluntary Blood Donation Camp next Monday with Quantum Foundation',
          content: 'We are partnering with Quantum Foundation for an on-site voluntary blood donation drive at our Dhaka headquarters. Your contribution saves lives!'
        }
      ];

      for (const pt of postTemplates) {
        // Asymmetric ECC ElGamal encryption of title and content
        const encTitle = await eccEncryptField(pt.title);
        const encContent = await eccEncryptField(pt.content);

        // Content hash for integrity
        const contentHash = crypto.createHash('sha256').update(pt.title + pt.content).digest('hex');
        const mac = generateMAC(contentHash);
        const signature = privateKey ? signMessage(contentHash, privateKey) : null;

        await prisma.post.create({
          data: {
            companyId: company.id,
            authorId: company.adminId,
            encrypted_title: encTitle,
            encrypted_content: encContent,
            integrity_hash: contentHash,
            mac_value: mac,
            ecc_signature: signature ? JSON.stringify(signature) : null
          }
        });
      }
      console.log(`  ✅ 6 ECC ElGamal Encrypted Posts seeded for ${company.name}`);
    }
  }

  console.log('\n🎉 ALL FEATURES POPULATED WITH 5-6 BANGLADESHI DATA ITEMS FOR ALL COMPANIES!');
  await prisma.$disconnect();
}

// Run if called directly
if (process.argv[1]?.includes('feedAllFeaturesBangladeshi')) {
  feedAllFeaturesBangladeshi()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Error feeding data:', err);
      process.exit(1);
    });
}
