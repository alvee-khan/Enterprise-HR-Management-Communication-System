import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import moment from 'moment';
import crypto from 'crypto';
import prisma from '../config/prisma.js';
import { generateRSAKeyPair } from '../security/rsa/rsaKeyGeneration.js';
import { generateECCKeyPair } from '../security/ecc/eccKeyGeneration.js';
import { generateMAC } from '../security/mac/generateMAC.js';
import { signMessage } from '../security/ecc/digitalSignature.js';
import { generateSalt, hashPasswordWithSalt } from '../security/authentication/passwordHashing.js';

dotenv.config();

const seedData = async () => {
  try {
    console.log('🌱 Connecting to PostgreSQL for Bangladeshi Demo Data Seeding...');
    await prisma.$connect();
    console.log('✅ Database connected');

    // ─── Clean up ────────────────────────────────────────────────
    await prisma.authenticationFactor.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.cryptographicKey.deleteMany({});
    await prisma.interviewInterviewer.deleteMany({});
    await prisma.announcementDepartment.deleteMany({});
    await prisma.projectMember.deleteMany({});
    await prisma.resume.deleteMany({});
    await prisma.interview.deleteMany({});
    await prisma.candidate.deleteMany({});
    await prisma.job.deleteMany({});
    await prisma.task.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.review.deleteMany({});
    await prisma.payroll.deleteMany({});
    await prisma.leave.deleteMany({});
    await prisma.attendance.deleteMany({});
    await prisma.document.deleteMany({});
    await prisma.message.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.announcement.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.user.updateMany({ data: { employeeProfileId: null, companyId: null } });
    await prisma.company.updateMany({ data: { adminId: null } });
    await prisma.department.updateMany({ data: { managerId: null, parentDeptId: null } });
    await prisma.employee.updateMany({ data: { managerId: null, departmentId: null } });
    await prisma.employee.deleteMany({});
    await prisma.department.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.company.deleteMany({});
    console.log('🧹 Cleaned up existing records including security and crypto keys');

    const salt = await bcrypt.genSalt(12);
    const pass = await bcrypt.hash('password123', salt);

    // ─── Super Admin ──────────────────────────────────────────────
    const superAdmin = await prisma.user.create({
      data: {
        name: 'Platform Super Admin',
        email: 'admin@hrms.com',
        password: pass,
        role: 'superAdmin',
        isActive: true,
        preferences: { theme: 'dark', notifications: true }
      }
    });

    // ─── Company: Bangladeshi Tech Enterprise ────────────────────
    const company = await prisma.company.create({
      data: {
        name: 'DigiBangla Solutions Ltd.',
        slug: 'digibangla',
        email: 'info@digibangla.com.bd',
        phone: '+880 2 9876543',
        website: 'https://digibangla.com.bd',
        address: {
          street: '42 Gulshan Avenue, Gulshan-2',
          city: 'Dhaka',
          state: 'Dhaka Division',
          country: 'Bangladesh',
          zipCode: '1212'
        },
        industry: 'Information Technology & Software Services',
        size: 'SIZE_51_200',
        founded: 2015,
        settings: {
          workingHours: { start: '09:00', end: '18:00' },
          workingDays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
          currency: 'BDT',
          timezone: 'Asia/Dhaka'
        },
        description: 'Leading software development, IT consulting, and cloud transformation firm in Bangladesh.'
      }
    });

    // ─── Users (Admins, Managers, Engineers) ─────────────────────
    const hrAdminUser = await prisma.user.create({
      data: { name: 'Fatema Begum', email: 'fatema@digibangla.com.bd', password: pass, role: 'companyAdmin', companyId: company.id, isActive: true, phone: '+8801711234567' }
    });
    // Secondary HR login alias for easy demo
    const hrDemoUser = await prisma.user.create({
      data: { name: 'HR Admin (Nexus/Digi)', email: 'hr@nexustech.io', password: pass, role: 'companyAdmin', companyId: company.id, isActive: true, phone: '+8801711234568' }
    });
    const ctoUser = await prisma.user.create({
      data: { name: 'Md. Rafiqul Islam', email: 'rafiq@digibangla.com.bd', password: pass, role: 'manager', companyId: company.id, isActive: true, phone: '+8801812345678' }
    });
    const designMgrUser = await prisma.user.create({
      data: { name: 'Sumaiya Khanam', email: 'sumaiya@digibangla.com.bd', password: pass, role: 'manager', companyId: company.id, isActive: true, phone: '+8801913456789' }
    });
    const salesMgrUser = await prisma.user.create({
      data: { name: 'Tanvir Ahmed', email: 'tanvir@digibangla.com.bd', password: pass, role: 'manager', companyId: company.id, isActive: true, phone: '+8801611567890' }
    });
    const dev1User = await prisma.user.create({
      data: { name: 'Md. Rakibul Hasan', email: 'rakib@digibangla.com.bd', password: pass, role: 'employee', companyId: company.id, isActive: true, phone: '+8801712678901' }
    });
    const dev2User = await prisma.user.create({
      data: { name: 'Nusrat Jahan', email: 'nusrat@digibangla.com.bd', password: pass, role: 'employee', companyId: company.id, isActive: true, phone: '+8801813789012' }
    });
    const dev3User = await prisma.user.create({
      data: { name: 'Sabbir Hossain', email: 'sabbir@digibangla.com.bd', password: pass, role: 'employee', companyId: company.id, isActive: true, phone: '+8801914890123' }
    });
    const des1User = await prisma.user.create({
      data: { name: 'Tasnim Akter', email: 'tasnim@digibangla.com.bd', password: pass, role: 'employee', companyId: company.id, isActive: true, phone: '+8801612901234' }
    });
    const mkt1User = await prisma.user.create({
      data: { name: 'Ariful Islam', email: 'arif@digibangla.com.bd', password: pass, role: 'employee', companyId: company.id, isActive: true, phone: '+8801711012345' }
    });
    const qa1User = await prisma.user.create({
      data: { name: 'Masum Billah', email: 'masum@digibangla.com.bd', password: pass, role: 'employee', companyId: company.id, isActive: true, phone: '+8801812123456' }
    });

    // ─── Departments ──────────────────────────────────────────────
    const engDept = await prisma.department.create({
      data: { name: 'Engineering', code: 'ENG', companyId: company.id, description: 'Software engineering, DevOps, and cloud systems', budget: 8500000, location: 'Gulshan Office - Level 4', color: '#6366f1' }
    });
    const hrDept = await prisma.department.create({
      data: { name: 'Human Resources', code: 'HR', companyId: company.id, description: 'Talent acquisition, employee wellness, payroll, and Bangladesh labor compliance', budget: 2800000, location: 'Gulshan Office - Level 2', color: '#ec4899' }
    });
    const desDept = await prisma.department.create({
      data: { name: 'Product & Design', code: 'DES', companyId: company.id, description: 'User experience research, UI design systems, and brand creative', budget: 3200000, location: 'Gulshan Office - Level 3', color: '#06b6d4' }
    });
    const salesDept = await prisma.department.create({
      data: { name: 'Sales & Marketing', code: 'MKT', companyId: company.id, description: 'Enterprise sales, digital marketing, and client accounts in Dhaka and Chittagong', budget: 4500000, location: 'Gulshan Office - Level 2', color: '#f59e0b' }
    });

    // ─── Employees with Bangladeshi Details ─────────────────────────
    const hrEmp = await prisma.employee.create({
      data: {
        companyId: company.id,
        employeeCode: 'DBS-001',
        name: 'Fatema Begum',
        email: 'fatema@digibangla.com.bd',
        phone: '+880 1711-234567',
        gender: 'Female',
        dateOfBirth: new Date('1988-03-12'),
        address: { street: 'House 5, Road 12, Dhanmondi', city: 'Dhaka', state: 'Dhaka', country: 'Bangladesh', zipCode: '1209' },
        departmentId: hrDept.id,
        designation: 'Head of People & Culture',
        joiningDate: new Date('2016-01-15'),
        employmentType: 'FullTime',
        status: 'Active',
        salary: { basic: 95000, currency: 'BDT', houseAllowance: 30000, medicalAllowance: 10000, transportAllowance: 10000 },
        skills: [{ name: 'Talent Acquisition', level: 95 }, { name: 'Payroll Compliance', level: 92 }, { name: 'Bangladesh Labor Law', level: 90 }, { name: 'Conflict Resolution', level: 88 }],
        education: [{ degree: 'MBA in HRM', institution: 'Institute of Business Administration (IBA), DU', year: 2012 }],
        bankDetails: { bankName: 'Dutch-Bangla Bank PLC', accountNumber: '1071234567890', branchName: 'Dhanmondi Branch', routingNumber: '090271234' },
        emergencyContact: { name: 'Dr. Anwarul Haque (Spouse)', phone: '+880 1712-998877', relationship: 'Spouse' },
        leaveBalance: { sick: 14, casual: 10, annual: 18, emergency: 5 },
        notes: 'National ID: 198830456789. Senior executive lead.'
      }
    });

    const ctoEmp = await prisma.employee.create({
      data: {
        companyId: company.id,
        employeeCode: 'DBS-002',
        name: 'Md. Rafiqul Islam',
        email: 'rafiq@digibangla.com.bd',
        phone: '+880 1812-345678',
        gender: 'Male',
        dateOfBirth: new Date('1985-07-22'),
        address: { street: 'Flat 4B, Block C, Bashundhara R/A', city: 'Dhaka', state: 'Dhaka', country: 'Bangladesh', zipCode: '1229' },
        departmentId: engDept.id,
        designation: 'Chief Technology Officer (CTO)',
        joiningDate: new Date('2015-06-01'),
        employmentType: 'FullTime',
        status: 'Active',
        salary: { basic: 160000, currency: 'BDT', houseAllowance: 50000, medicalAllowance: 15000, transportAllowance: 15000 },
        skills: [{ name: 'System Architecture', level: 98 }, { name: 'PostgreSQL & Prisma', level: 95 }, { name: 'Node.js & Go', level: 92 }, { name: 'Cloud & Kubernetes', level: 90 }],
        education: [{ degree: 'B.Sc. in CSE', institution: 'BUET', year: 2008 }, { degree: 'M.Sc. in Distributed Systems', institution: 'University of Dhaka', year: 2011 }],
        bankDetails: { bankName: 'BRAC Bank PLC', accountNumber: '1502345678901', branchName: 'Gulshan Branch', routingNumber: '060261234' },
        emergencyContact: { name: 'Salma Islam (Spouse)', phone: '+880 1819-112233', relationship: 'Spouse' },
        leaveBalance: { sick: 12, casual: 10, annual: 20, emergency: 5 },
        notes: 'National ID: 198574123456. Technical co-founder.'
      }
    });

    const desMgrEmp = await prisma.employee.create({
      data: {
        companyId: company.id,
        employeeCode: 'DBS-003',
        name: 'Sumaiya Khanam',
        email: 'sumaiya@digibangla.com.bd',
        phone: '+880 1913-456789',
        gender: 'Female',
        dateOfBirth: new Date('1991-11-05'),
        address: { street: 'House 18, Road 4, Mirpur DOHS', city: 'Dhaka', state: 'Dhaka', country: 'Bangladesh', zipCode: '1216' },
        departmentId: desDept.id,
        designation: 'Lead Product Designer',
        joiningDate: new Date('2018-03-10'),
        employmentType: 'FullTime',
        status: 'Active',
        salary: { basic: 90000, currency: 'BDT', houseAllowance: 28000, medicalAllowance: 10000, transportAllowance: 8000 },
        skills: [{ name: 'Figma & Design Systems', level: 97 }, { name: 'User Research', level: 92 }, { name: 'UI/UX Design', level: 95 }, { name: 'Tailwind CSS', level: 85 }],
        education: [{ degree: 'BFA in Graphic Design', institution: 'Faculty of Fine Arts (Charukala), DU', year: 2014 }],
        bankDetails: { bankName: 'Islami Bank Bangladesh PLC', accountNumber: '20505100900140982', branchName: 'Mirpur-10 Branch', routingNumber: '125261234' },
        leaveBalance: { sick: 13, casual: 10, annual: 18, emergency: 5 },
        notes: 'National ID: 199145678901.'
      }
    });

    const salesMgrEmp = await prisma.employee.create({
      data: {
        companyId: company.id,
        employeeCode: 'DBS-004',
        name: 'Tanvir Ahmed',
        email: 'tanvir@digibangla.com.bd',
        phone: '+880 1611-567890',
        gender: 'Male',
        dateOfBirth: new Date('1987-04-18'),
        address: { street: 'Road 5, Sector 7, Uttara', city: 'Dhaka', state: 'Dhaka', country: 'Bangladesh', zipCode: '1230' },
        departmentId: salesDept.id,
        designation: 'VP of Commercial & Growth',
        joiningDate: new Date('2017-09-01'),
        employmentType: 'FullTime',
        status: 'Active',
        salary: { basic: 95000, currency: 'BDT', houseAllowance: 30000, medicalAllowance: 10000, transportAllowance: 12000 },
        skills: [{ name: 'B2B Enterprise Sales', level: 96 }, { name: 'Client Account Management', level: 92 }, { name: 'Strategic Negotiation', level: 90 }],
        education: [{ degree: 'BBA in Marketing', institution: 'North South University (NSU)', year: 2010 }],
        bankDetails: { bankName: 'Eastern Bank PLC (EBL)', accountNumber: '1101234098765', branchName: 'Uttara Branch', routingNumber: '095261234' },
        leaveBalance: { sick: 11, casual: 10, annual: 16, emergency: 5 },
        notes: 'National ID: 198745678902.'
      }
    });

    const dev1Emp = await prisma.employee.create({
      data: {
        companyId: company.id,
        employeeCode: 'DBS-005',
        name: 'Md. Rakibul Hasan',
        email: 'rakib@digibangla.com.bd',
        phone: '+880 1712-678901',
        gender: 'Male',
        dateOfBirth: new Date('1996-09-14'),
        address: { street: 'Flat 3A, Shyamoli, Ring Road', city: 'Dhaka', state: 'Dhaka', country: 'Bangladesh', zipCode: '1207' },
        departmentId: engDept.id,
        designation: 'Senior Full Stack Engineer',
        managerId: ctoEmp.id,
        joiningDate: new Date('2020-02-01'),
        employmentType: 'FullTime',
        status: 'Active',
        salary: { basic: 80000, currency: 'BDT', houseAllowance: 25000, medicalAllowance: 8000, transportAllowance: 7000 },
        skills: [{ name: 'React.js', level: 94 }, { name: 'Node.js & Express', level: 90 }, { name: 'PostgreSQL', level: 88 }, { name: 'Docker', level: 82 }, { name: 'TypeScript', level: 85 }],
        education: [{ degree: 'B.Sc. in CSE', institution: 'BRAC University', year: 2019 }],
        bankDetails: { bankName: 'City Bank PLC', accountNumber: '1750001234567', branchName: 'Mohammadpur Branch', routingNumber: '225261234' },
        leaveBalance: { sick: 12, casual: 10, annual: 16, emergency: 5 },
        notes: 'National ID: 199612345678. Core contributor on national portal projects.'
      }
    });

    const dev2Emp = await prisma.employee.create({
      data: {
        companyId: company.id,
        employeeCode: 'DBS-006',
        name: 'Nusrat Jahan',
        email: 'nusrat@digibangla.com.bd',
        phone: '+880 1813-789012',
        gender: 'Female',
        dateOfBirth: new Date('1998-02-25'),
        address: { street: 'House 12, East Rayer Bazar, Adabor', city: 'Dhaka', state: 'Dhaka', country: 'Bangladesh', zipCode: '1207' },
        departmentId: engDept.id,
        designation: 'Frontend Engineer',
        managerId: ctoEmp.id,
        joiningDate: new Date('2021-07-15'),
        employmentType: 'FullTime',
        status: 'Active',
        salary: { basic: 60000, currency: 'BDT', houseAllowance: 18000, medicalAllowance: 7000, transportAllowance: 5000 },
        skills: [{ name: 'React.js', level: 90 }, { name: 'Next.js', level: 85 }, { name: 'Tailwind CSS', level: 94 }, { name: 'UI Components', level: 92 }],
        education: [{ degree: 'B.Sc. in Software Engineering', institution: 'IIT, University of Dhaka', year: 2021 }],
        bankDetails: { bankName: 'Dutch-Bangla Bank PLC', accountNumber: '1071987654321', branchName: 'Adabor Branch', routingNumber: '090272234' },
        leaveBalance: { sick: 13, casual: 10, annual: 14, emergency: 5 },
        notes: 'National ID: 199812345679.'
      }
    });

    const dev3Emp = await prisma.employee.create({
      data: {
        companyId: company.id,
        employeeCode: 'DBS-007',
        name: 'Sabbir Hossain',
        email: 'sabbir@digibangla.com.bd',
        phone: '+880 1914-890123',
        gender: 'Male',
        dateOfBirth: new Date('1995-06-30'),
        address: { street: 'Flat 7, Road 11, Banani', city: 'Dhaka', state: 'Dhaka', country: 'Bangladesh', zipCode: '1213' },
        departmentId: engDept.id,
        designation: 'DevOps & Backend Engineer',
        managerId: ctoEmp.id,
        joiningDate: new Date('2019-11-01'),
        employmentType: 'FullTime',
        status: 'Active',
        salary: { basic: 75000, currency: 'BDT', houseAllowance: 22000, medicalAllowance: 8000, transportAllowance: 6000 },
        skills: [{ name: 'AWS & Cloud Architecture', level: 90 }, { name: 'Docker & Kubernetes', level: 88 }, { name: 'CI/CD Pipelines', level: 92 }, { name: 'PostgreSQL Administration', level: 86 }],
        education: [{ degree: 'B.Sc. in CSE', institution: 'Shahjalal University of Science and Technology (SUST)', year: 2018 }],
        bankDetails: { bankName: 'BRAC Bank PLC', accountNumber: '1502876543219', branchName: 'Banani Branch', routingNumber: '060262234' },
        leaveBalance: { sick: 12, casual: 10, annual: 18, emergency: 5 },
        notes: 'National ID: 199534567890.'
      }
    });

    const des1Emp = await prisma.employee.create({
      data: {
        companyId: company.id,
        employeeCode: 'DBS-008',
        name: 'Tasnim Akter',
        email: 'tasnim@digibangla.com.bd',
        phone: '+880 1612-901234',
        gender: 'Female',
        dateOfBirth: new Date('1999-12-10'),
        address: { street: 'Road 3, Block D, Bashabo', city: 'Dhaka', state: 'Dhaka', country: 'Bangladesh', zipCode: '1214' },
        departmentId: desDept.id,
        designation: 'UI/UX Visual Designer',
        managerId: desMgrEmp.id,
        joiningDate: new Date('2022-04-01'),
        employmentType: 'FullTime',
        status: 'Active',
        salary: { basic: 50000, currency: 'BDT', houseAllowance: 15000, medicalAllowance: 6000, transportAllowance: 4000 },
        skills: [{ name: 'Figma', level: 92 }, { name: 'Adobe Illustrator', level: 88 }, { name: 'Motion Design', level: 80 }, { name: 'Design Prototyping', level: 89 }],
        education: [{ degree: 'B.Sc. in Computer Science', institution: 'East West University (EWU)', year: 2022 }],
        bankDetails: { bankName: 'Sonali Bank PLC', accountNumber: '0200111234567', branchName: 'Bashabo Branch', routingNumber: '200261234' },
        leaveBalance: { sick: 14, casual: 10, annual: 12, emergency: 5 },
        notes: 'National ID: 199923456781.'
      }
    });

    const mkt1Emp = await prisma.employee.create({
      data: {
        companyId: company.id,
        employeeCode: 'DBS-009',
        name: 'Ariful Islam',
        email: 'arif@digibangla.com.bd',
        phone: '+880 1711-012345',
        gender: 'Male',
        dateOfBirth: new Date('1993-08-05'),
        address: { street: 'House 7, Road 14, Khilgaon', city: 'Dhaka', state: 'Dhaka', country: 'Bangladesh', zipCode: '1219' },
        departmentId: salesDept.id,
        designation: 'Senior Growth & Marketing Lead',
        managerId: salesMgrEmp.id,
        joiningDate: new Date('2021-01-10'),
        employmentType: 'FullTime',
        status: 'Active',
        salary: { basic: 48000, currency: 'BDT', houseAllowance: 14000, medicalAllowance: 5000, transportAllowance: 5000 },
        skills: [{ name: 'Facebook & Meta Ads', level: 94 }, { name: 'Google Ads & SEO', level: 90 }, { name: 'Content Marketing', level: 85 }, { name: 'Analytics & Attribution', level: 88 }],
        education: [{ degree: 'BBA in Marketing', institution: 'American International University-Bangladesh (AIUB)', year: 2017 }],
        bankDetails: { bankName: 'The City Bank PLC', accountNumber: '1105123456789', branchName: 'Khilgaon Branch', routingNumber: '225262234' },
        leaveBalance: { sick: 11, casual: 10, annual: 14, emergency: 5 },
        notes: 'National ID: 199378901234.'
      }
    });

    const qa1Emp = await prisma.employee.create({
      data: {
        companyId: company.id,
        employeeCode: 'DBS-010',
        name: 'Masum Billah',
        email: 'masum@digibangla.com.bd',
        phone: '+880 1812-123456',
        gender: 'Male',
        dateOfBirth: new Date('1994-05-20'),
        address: { street: 'Flat 2C, Jigatola Main Road', city: 'Dhaka', state: 'Dhaka', country: 'Bangladesh', zipCode: '1209' },
        departmentId: engDept.id,
        designation: 'QA Automation Engineer',
        managerId: ctoEmp.id,
        joiningDate: new Date('2020-09-01'),
        employmentType: 'FullTime',
        status: 'Active',
        salary: { basic: 55000, currency: 'BDT', houseAllowance: 16000, medicalAllowance: 6000, transportAllowance: 5000 },
        skills: [{ name: 'Cypress & Playwright', level: 88 }, { name: 'API Testing (Postman)', level: 94 }, { name: 'JIRA Test Management', level: 90 }, { name: 'Performance Testing (k6)', level: 82 }],
        education: [{ degree: 'B.Sc. in CSE', institution: 'United International University (UIU)', year: 2017 }],
        bankDetails: { bankName: 'AB Bank PLC', accountNumber: '4001123456789', branchName: 'Science Lab Branch', routingNumber: '020261234' },
        leaveBalance: { sick: 12, casual: 10, annual: 16, emergency: 5 },
        notes: 'National ID: 199489012345.'
      }
    });

    // ─── Link Users to Employee Profiles ──────────────────────────
    await prisma.user.update({ where: { id: hrAdminUser.id }, data: { employeeProfileId: hrEmp.id } });
    await prisma.user.update({ where: { id: ctoUser.id }, data: { employeeProfileId: ctoEmp.id } });
    await prisma.user.update({ where: { id: designMgrUser.id }, data: { employeeProfileId: desMgrEmp.id } });
    await prisma.user.update({ where: { id: salesMgrUser.id }, data: { employeeProfileId: salesMgrEmp.id } });
    await prisma.user.update({ where: { id: dev1User.id }, data: { employeeProfileId: dev1Emp.id } });
    await prisma.user.update({ where: { id: dev2User.id }, data: { employeeProfileId: dev2Emp.id } });
    await prisma.user.update({ where: { id: dev3User.id }, data: { employeeProfileId: dev3Emp.id } });
    await prisma.user.update({ where: { id: des1User.id }, data: { employeeProfileId: des1Emp.id } });
    await prisma.user.update({ where: { id: mkt1User.id }, data: { employeeProfileId: mkt1Emp.id } });
    await prisma.user.update({ where: { id: qa1User.id }, data: { employeeProfileId: qa1Emp.id } });

    // Link Company Admin & Dept Managers
    await prisma.company.update({ where: { id: company.id }, data: { adminId: hrAdminUser.id } });
    await prisma.department.update({ where: { id: hrDept.id }, data: { managerId: hrEmp.id } });
    await prisma.department.update({ where: { id: engDept.id }, data: { managerId: ctoEmp.id } });
    await prisma.department.update({ where: { id: desDept.id }, data: { managerId: desMgrEmp.id } });
    await prisma.department.update({ where: { id: salesDept.id }, data: { managerId: salesMgrEmp.id } });

    console.log('✅ Company, Departments, 10 Bangladeshi Employees & Users Created');

    // ─── Attendance Records (Bangladesh standard Sun-Thu week) ────
    const allPairs = [
      [hrEmp, hrAdminUser], [ctoEmp, ctoUser], [desMgrEmp, designMgrUser],
      [salesMgrEmp, salesMgrUser], [dev1Emp, dev1User], [dev2Emp, dev2User],
      [dev3Emp, dev3User], [des1Emp, des1User], [mkt1Emp, mkt1User], [qa1Emp, qa1User]
    ];

    let workingDaysCount = 0;
    let currDay = moment().subtract(1, 'days');
    const attendanceBatch = [];

    while (workingDaysCount < 22) {
      const dayOfWeek = currDay.day(); // 0=Sun, 1=Mon, ..., 5=Fri (off), 6=Sat (off)
      if (dayOfWeek !== 5 && dayOfWeek !== 6) {
        for (const [emp, usr] of allPairs) {
          const isLate = Math.random() < 0.12;
          const checkInMin = isLate ? 15 + Math.floor(Math.random() * 30) : Math.floor(Math.random() * 12);
          const checkIn = currDay.clone().hour(9).minute(checkInMin).second(0).toDate();
          const checkOut = currDay.clone().hour(18).minute(Math.floor(Math.random() * 25)).second(0).toDate();
          const workingMins = Math.round((checkOut.getTime() - checkIn.getTime()) / 60000);

          attendanceBatch.push({
            employeeId: emp.id,
            userId: usr.id,
            companyId: company.id,
            date: currDay.clone().startOf('day').toDate(),
            checkIn,
            checkOut,
            workingHours: workingMins,
            status: isLate ? 'Late' : 'Present',
            isLate,
            lateMinutes: isLate ? checkInMin : 0,
            checkInMethod: 'web',
            notes: isLate ? 'Dhaka traffic congestion around Mohakhali Flyover' : null
          });
        }
        workingDaysCount++;
      }
      currDay.subtract(1, 'days');
    }
    await prisma.attendance.createMany({ data: attendanceBatch });
    console.log(`✅ Attendance seeded: ${attendanceBatch.length} records across 22 working days`);

    // ─── Leave Applications ────────────────────────────────────────
    await prisma.leave.createMany({
      data: [
        {
          employeeId: dev2Emp.id, userId: dev2User.id, companyId: company.id,
          type: 'Sick', startDate: moment().add(1, 'days').toDate(), endDate: moment().add(2, 'days').toDate(),
          totalDays: 2, reason: 'Suffering from seasonal viral fever and acute migraine (doctor consultation at Ibn Sina)', status: 'Pending'
        },
        {
          employeeId: dev1Emp.id, userId: dev1User.id, companyId: company.id,
          type: 'Casual', startDate: moment().add(6, 'days').toDate(), endDate: moment().add(7, 'days').toDate(),
          totalDays: 2, reason: 'Attending cousin\'s wedding ceremony in Sylhet', status: 'Pending'
        },
        {
          employeeId: mkt1Emp.id, userId: mkt1User.id, companyId: company.id,
          type: 'Annual', startDate: moment().subtract(12, 'days').toDate(), endDate: moment().subtract(8, 'days').toDate(),
          totalDays: 5, reason: 'Eid-ul-Fitr family visit to native village in Barisal', status: 'Approved',
          approvedById: hrAdminUser.id, approvedAt: moment().subtract(14, 'days').toDate()
        },
        {
          employeeId: qa1Emp.id, userId: qa1User.id, companyId: company.id,
          type: 'Casual', startDate: moment().subtract(4, 'days').toDate(), endDate: moment().subtract(4, 'days').toDate(),
          totalDays: 1, reason: 'Passport renewal and Smart NID biometric verification at Agargaon Passport Office', status: 'Approved',
          approvedById: hrAdminUser.id, approvedAt: moment().subtract(5, 'days').toDate()
        },
        {
          employeeId: des1Emp.id, userId: des1User.id, companyId: company.id,
          type: 'Sick', startDate: moment().subtract(18, 'days').toDate(), endDate: moment().subtract(16, 'days').toDate(),
          totalDays: 3, reason: 'Severe food poisoning and dengue test', status: 'Approved',
          approvedById: hrAdminUser.id, approvedAt: moment().subtract(19, 'days').toDate()
        },
        {
          employeeId: dev3Emp.id, userId: dev3User.id, companyId: company.id,
          type: 'Annual', startDate: moment().add(14, 'days').toDate(), endDate: moment().add(19, 'days').toDate(),
          totalDays: 6, reason: 'Family holiday tour to Cox\'s Bazar and Saint Martin\'s Island', status: 'Pending'
        },
        {
          employeeId: salesMgrEmp.id, userId: salesMgrUser.id, companyId: company.id,
          type: 'Casual', startDate: moment().subtract(25, 'days').toDate(), endDate: moment().subtract(24, 'days').toDate(),
          totalDays: 2, reason: 'Official business development trip to Agrabad Commercial Area, Chittagong', status: 'Approved',
          approvedById: hrAdminUser.id, approvedAt: moment().subtract(27, 'days').toDate()
        }
      ]
    });
    console.log('✅ Leave records seeded with Bangladeshi reasons & approvals');

    // ─── Payroll History (BDT Monthly Slips) ───────────────────────
    const payrollMatrix = [
      { emp: hrEmp, basic: 95000, allowances: [{ name: 'House Rent', amount: 30000 }, { name: 'Medical', amount: 10000 }, { name: 'Transport', amount: 10000 }], deductions: [{ name: 'Provident Fund (PF)', amount: 9500 }], tax: 4500 },
      { emp: ctoEmp, basic: 160000, allowances: [{ name: 'House Rent', amount: 50000 }, { name: 'Medical', amount: 15000 }, { name: 'Transport', amount: 15000 }], deductions: [{ name: 'Provident Fund (PF)', amount: 16000 }], tax: 14000 },
      { emp: desMgrEmp, basic: 90000, allowances: [{ name: 'House Rent', amount: 28000 }, { name: 'Medical', amount: 10000 }, { name: 'Transport', amount: 8000 }], deductions: [{ name: 'Provident Fund (PF)', amount: 9000 }], tax: 4000 },
      { emp: salesMgrEmp, basic: 95000, allowances: [{ name: 'House Rent', amount: 30000 }, { name: 'Medical', amount: 10000 }, { name: 'Transport', amount: 12000 }], deductions: [{ name: 'Provident Fund (PF)', amount: 9500 }], tax: 4800 },
      { emp: dev1Emp, basic: 80000, allowances: [{ name: 'House Rent', amount: 25000 }, { name: 'Medical', amount: 8000 }, { name: 'Transport', amount: 7000 }], deductions: [{ name: 'Provident Fund (PF)', amount: 8000 }], tax: 3200 },
      { emp: dev2Emp, basic: 60000, allowances: [{ name: 'House Rent', amount: 18000 }, { name: 'Medical', amount: 7000 }, { name: 'Transport', amount: 5000 }], deductions: [{ name: 'Provident Fund (PF)', amount: 6000 }], tax: 1800 },
      { emp: dev3Emp, basic: 75000, allowances: [{ name: 'House Rent', amount: 22000 }, { name: 'Medical', amount: 8000 }, { name: 'Transport', amount: 6000 }], deductions: [{ name: 'Provident Fund (PF)', amount: 7500 }], tax: 2800 },
      { emp: des1Emp, basic: 50000, allowances: [{ name: 'House Rent', amount: 15000 }, { name: 'Medical', amount: 6000 }, { name: 'Transport', amount: 4000 }], deductions: [{ name: 'Provident Fund (PF)', amount: 5000 }], tax: 1200 },
      { emp: mkt1Emp, basic: 48000, allowances: [{ name: 'House Rent', amount: 14000 }, { name: 'Medical', amount: 5000 }, { name: 'Transport', amount: 5000 }], deductions: [{ name: 'Provident Fund (PF)', amount: 4800 }], tax: 1000 },
      { emp: qa1Emp, basic: 55000, allowances: [{ name: 'House Rent', amount: 16000 }, { name: 'Medical', amount: 6000 }, { name: 'Transport', amount: 5000 }], deductions: [{ name: 'Provident Fund (PF)', amount: 5500 }], tax: 1500 },
    ];

    const payrollBatches = [];
    for (const p of payrollMatrix) {
      for (const mOffset of [1, 2]) {
        const monthDate = moment().subtract(mOffset, 'months');
        const totalAllowances = p.allowances.reduce((s, a) => s + a.amount, 0);
        const totalBonuses = mOffset === 1 && p.emp.id === dev1Emp.id ? 15000 : 0;
        const totalDeductions = p.deductions.reduce((s, d) => s + d.amount, 0);
        const grossSalary = p.basic + totalAllowances + totalBonuses;
        const netSalary = grossSalary - totalDeductions - p.tax;

        payrollBatches.push({
          employeeId: p.emp.id,
          companyId: company.id,
          month: monthDate.month() + 1,
          year: monthDate.year(),
          basicSalary: p.basic,
          allowances: p.allowances,
          bonuses: totalBonuses > 0 ? [{ name: 'Performance Bonus (National Portal Release)', amount: totalBonuses }] : [],
          deductions: p.deductions,
          tax: p.tax,
          totalAllowances,
          totalBonuses,
          totalDeductions,
          grossSalary,
          netSalary,
          currency: 'BDT',
          status: 'Paid',
          paymentDate: monthDate.endOf('month').toDate(),
          paymentMethod: 'BankTransfer',
          paidById: hrAdminUser.id,
          workingDays: 22,
          presentDays: 21,
          generatedById: hrAdminUser.id,
          notes: 'Disbursed via Bangladesh Electronic Funds Transfer Network (BEFTN)'
        });
      }
    }
    await prisma.payroll.createMany({ data: payrollBatches });
    console.log(`✅ Payroll records seeded (${payrollBatches.length} BDT payroll slips)`);

    // ─── Projects (Bangladeshi Tech & Digital Solutions) ───────────
    const proj1 = await prisma.project.create({
      data: {
        companyId: company.id,
        name: 'Dhaka City Citizen Services Digital Platform',
        description: 'Comprehensive digital public service platform for Dhaka North & South City Corporation enabling trade license e-renewal, property tax payment, and holding assessment.',
        managerId: ctoEmp.id,
        status: 'Active',
        priority: 'Critical',
        startDate: moment().subtract(3, 'months').toDate(),
        endDate: moment().add(2, 'months').toDate(),
        budget: 4500000,
        progress: 75,
        tags: ['React', 'Node.js', 'PostgreSQL', 'Digital Bangladesh', 'SSLCommerz', 'Smart NID'],
        color: '#6366f1',
        members: {
          create: [
            { employeeId: ctoEmp.id },
            { employeeId: dev1Emp.id },
            { employeeId: dev2Emp.id },
            { employeeId: dev3Emp.id },
            { employeeId: qa1Emp.id }
          ]
        }
      }
    });

    const proj2 = await prisma.project.create({
      data: {
        companyId: company.id,
        name: 'BDWallet — Microfinance & Agent Banking App',
        description: 'Next-generation mobile financial service (MFS) integrating bKash, Nagad, and Rocket QR payment gateways with offline QR capability for rural merchants.',
        managerId: ctoEmp.id,
        status: 'Active',
        priority: 'High',
        startDate: moment().subtract(2, 'months').toDate(),
        endDate: moment().add(4, 'months').toDate(),
        budget: 6000000,
        progress: 45,
        tags: ['React Native', 'FinTech', 'bKash API', 'Nagad API', 'PostgreSQL', 'NPSB'],
        color: '#06b6d4',
        members: {
          create: [
            { employeeId: ctoEmp.id },
            { employeeId: dev1Emp.id },
            { employeeId: dev3Emp.id },
            { employeeId: desMgrEmp.id }
          ]
        }
      }
    });

    const proj3 = await prisma.project.create({
      data: {
        companyId: company.id,
        name: 'Shurjo B2B E-Commerce Marketplace',
        description: 'Wholesale B2B supply chain and merchant ordering portal connecting wholesale suppliers from Chawkbazar, Khatunganj, and Nawabpur with retail shopkeepers across Bangladesh.',
        managerId: salesMgrEmp.id,
        status: 'Planning',
        priority: 'Medium',
        startDate: moment().subtract(1, 'month').toDate(),
        endDate: moment().add(5, 'months').toDate(),
        budget: 3500000,
        progress: 20,
        tags: ['B2B', 'E-Commerce', 'Supply Chain', 'Chittagong', 'Dhaka'],
        color: '#f59e0b',
        members: {
          create: [
            { employeeId: salesMgrEmp.id },
            { employeeId: desMgrEmp.id },
            { employeeId: des1Emp.id },
            { employeeId: mkt1Emp.id }
          ]
        }
      }
    });

    console.log('✅ Projects created (Dhaka Citizen Portal, BDWallet, Shurjo B2B)');

    // ─── Kanban Tasks ─────────────────────────────────────────────
    await prisma.task.createMany({
      data: [
        {
          projectId: proj1.id, companyId: company.id,
          title: 'Implement Bangladesh Smart NID Verification API',
          description: 'Integrate Porichoy / Election Commission Smart NID verification endpoint for authenticating citizen registrations.',
          assigneeId: dev1Emp.id, assignedById: ctoUser.id,
          status: 'Completed', priority: 'Urgent',
          deadline: moment().subtract(8, 'days').toDate(), completedAt: moment().subtract(6, 'days').toDate(),
          position: 0, tags: ['Security', 'API', 'NID']
        },
        {
          projectId: proj1.id, companyId: company.id,
          title: 'Integrate SSLCommerz & bKash Payment Gateways',
          description: 'Configure automated fee collection for trade licenses through SSLCommerz gateway with auto IPN callback verification.',
          assigneeId: dev3Emp.id, assignedById: ctoUser.id,
          status: 'InProgress', priority: 'Urgent',
          deadline: moment().add(4, 'days').toDate(),
          position: 1, tags: ['Payments', 'SSLCommerz', 'bKash']
        },
        {
          projectId: proj1.id, companyId: company.id,
          title: 'Bangla (বাংলা) Language Localization & Font Optimization',
          description: 'Implement complete Bangla translation strings with SolaimanLipi / Noto Sans Bengali font rendering across all citizen forms.',
          assigneeId: dev2Emp.id, assignedById: ctoUser.id,
          status: 'Review', priority: 'High',
          deadline: moment().add(3, 'days').toDate(),
          position: 2, tags: ['i18n', 'Bangla', 'UI']
        },
        {
          projectId: proj1.id, companyId: company.id,
          title: 'Conduct Automated Stress Testing for High Traffic Citizen Portal',
          description: 'Run k6 load test simulating 10,000 concurrent citizen tax payment submissions during tax season peak hours.',
          assigneeId: qa1Emp.id, assignedById: ctoUser.id,
          status: 'Todo', priority: 'High',
          deadline: moment().add(7, 'days').toDate(),
          position: 3, tags: ['QA', 'Performance', 'Testing']
        },

        {
          projectId: proj2.id, companyId: company.id,
          title: 'Design Bangla-First Mobile Payment UI & Merchant QR Card',
          description: 'Create intuitive high-contrast UI screens in Figma optimized for low-end Android devices used by small shopkeepers.',
          assigneeId: desMgrEmp.id, assignedById: ctoUser.id,
          status: 'Completed', priority: 'High',
          deadline: moment().subtract(12, 'days').toDate(), completedAt: moment().subtract(10, 'days').toDate(),
          position: 0, tags: ['Figma', 'Mobile', 'UI/UX']
        },
        {
          projectId: proj2.id, companyId: company.id,
          title: 'Implement Offline QR Code Generation with HMAC Signatures',
          description: 'Generate digitally signed QR codes for offline verification when mobile internet has low connectivity in rural areas.',
          assigneeId: dev1Emp.id, assignedById: ctoUser.id,
          status: 'InProgress', priority: 'Urgent',
          deadline: moment().add(6, 'days').toDate(),
          position: 1, tags: ['Crypto', 'Security', 'FinTech']
        },
        {
          projectId: proj2.id, companyId: company.id,
          title: 'Nagad & Rocket API Sandbox Webhook Handlers',
          description: 'Implement resilient webhook listener with PostgreSQL transactional retry mechanisms for failed MFS payouts.',
          assigneeId: dev3Emp.id, assignedById: ctoUser.id,
          status: 'Todo', priority: 'Urgent',
          deadline: moment().add(10, 'days').toDate(),
          position: 2, tags: ['Backend', 'Nagad', 'Webhooks']
        },

        // Company Operational Tasks
        {
          companyId: company.id,
          title: 'Q3 Eid Festival Digital Marketing Campaign Execution',
          description: 'Coordinate digital sponsorship and Facebook video ads campaign targeting SMEs across Dhaka, Chittagong, and Sylhet.',
          assigneeId: mkt1Emp.id, assignedById: salesMgrUser.id,
          status: 'Completed', priority: 'High',
          deadline: moment().subtract(5, 'days').toDate(), completedAt: moment().subtract(4, 'days').toDate(),
          position: 0, tags: ['Marketing', 'Eid Campaign', 'Meta Ads']
        },
        {
          companyId: company.id,
          title: 'Update Company Annual Leave Policy as per Bangladesh Labor Act 2006',
          description: 'Review statutory earned leave encashment rules, maternity benefits, and festival holiday calculations.',
          assigneeId: hrEmp.id, assignedById: hrAdminUser.id,
          status: 'InProgress', priority: 'High',
          deadline: moment().add(8, 'days').toDate(),
          position: 1, tags: ['HR', 'Policy', 'Legal']
        },
        {
          companyId: company.id,
          title: 'Setup High Availability PostgreSQL Cluster on AWS Bahrain/Mumbai Region',
          description: 'Configure automated point-in-time recovery (PITR) backups, read replicas, and SSL enforcement for production database.',
          assigneeId: dev3Emp.id, assignedById: ctoUser.id,
          status: 'InProgress', priority: 'High',
          deadline: moment().add(5, 'days').toDate(),
          position: 2, tags: ['DevOps', 'PostgreSQL', 'AWS']
        }
      ]
    });
    console.log('✅ Kanban tasks seeded');

    // ─── Performance Reviews ───────────────────────────────────────
    await prisma.review.create({
      data: {
        employeeId: dev1Emp.id, reviewerId: ctoUser.id, companyId: company.id,
        period: 'Q2-2025', periodType: 'Quarterly',
        criteria: [
          { name: 'System Architecture & Clean Code', score: 9, weight: 30 },
          { name: 'On-Time Project Delivery', score: 9, weight: 25 },
          { name: 'Collaboration & Mentorship', score: 8, weight: 20 },
          { name: 'Innovation & Problem Solving', score: 9, weight: 15 },
          { name: 'Bangladesh Compliance Awareness', score: 9, weight: 10 }
        ],
        overallScore: 8.85, rating: 'Excellent',
        comments: 'Rakibul bhai has delivered phenomenal results on the citizen portal Smart NID module. Highly dedicated and dependable engineer.',
        strengths: ['Expertise in PostgreSQL and Node.js backend', 'Fast learner on regulatory integrations', 'Active code reviewer'],
        improvements: ['Can contribute more to architecture documentation', 'Encouraged to present tech talks to junior team members'],
        goals: ['Lead the offline QR cryptographic payment engine', 'Guide junior frontend developers on SSR best practices'],
        status: 'Acknowledged', employeeAcknowledged: true, acknowledgedAt: moment().subtract(3, 'days').toDate()
      }
    });

    await prisma.review.create({
      data: {
        employeeId: dev2Emp.id, reviewerId: ctoUser.id, companyId: company.id,
        period: 'Q2-2025', periodType: 'Quarterly',
        criteria: [
          { name: 'Frontend Code Quality', score: 8, weight: 30 },
          { name: 'UI/UX Pixel Precision', score: 9, weight: 25 },
          { name: 'Speed & Responsiveness', score: 8, weight: 20 },
          { name: 'Team Collaboration', score: 9, weight: 15 },
          { name: 'Bangla Typography & Accessibility', score: 9, weight: 10 }
        ],
        overallScore: 8.50, rating: 'Good',
        comments: 'Nusrat delivered a flawless Bangla localization setup. Great sense of UI polish and component architecture.',
        strengths: ['Great attention to UI detail and responsive mobile design', 'Excellent communication in sprint standups'],
        improvements: ['Expand understanding of state management performance in large applications'],
        goals: ['Master Next.js server components', 'Take ownership of BDWallet mobile component library'],
        status: 'Acknowledged', employeeAcknowledged: true, acknowledgedAt: moment().subtract(2, 'days').toDate()
      }
    });

    await prisma.review.create({
      data: {
        employeeId: mkt1Emp.id, reviewerId: salesMgrUser.id, companyId: company.id,
        period: 'Q2-2025', periodType: 'Quarterly',
        criteria: [
          { name: 'Lead Generation Volume', score: 9, weight: 35 },
          { name: 'Cost Per Acquisition (CPA)', score: 9, weight: 25 },
          { name: 'Ad Creative Quality (Bangla)', score: 9, weight: 20 },
          { name: 'Cross-functional Collaboration', score: 8, weight: 20 }
        ],
        overallScore: 8.80, rating: 'Excellent',
        comments: 'Ariful achieved a 145% target on the Eid B2B marketing campaign with CPA well below budget.',
        strengths: ['Deep understanding of Bangladeshi consumer psychology and regional language nuances', 'Data-driven mindset'],
        improvements: ['Develop automated reporting dashboards for real-time campaign spend tracking'],
        goals: ['Launch Chittagong commercial sector enterprise campaign', 'Implement WhatsApp Business API integration'],
        status: 'Submitted'
      }
    });
    console.log('✅ Performance reviews seeded');

    // ─── Recruitment: Jobs & Candidates ───────────────────────────
    const job1 = await prisma.job.create({
      data: {
        companyId: company.id,
        title: 'Senior Backend Engineer (Node.js, PostgreSQL & Prisma)',
        departmentId: engDept.id,
        postedById: hrAdminUser.id,
        description: 'DigiBangla is looking for an experienced Senior Backend Engineer to architect and build high-throughput fintech and citizen-facing microservices in Dhaka.',
        requirements: ['5+ years experience building production backend systems with Node.js / TypeScript', 'Expert level knowledge of PostgreSQL database design, indexing, and Prisma ORM', 'Experience with payment gateway integrations (bKash, SSLCommerz, Nagad)', 'Strong understanding of REST APIs, WebSockets, and Redis caching'],
        responsibilities: ['Architect scalable, secure APIs with PostgreSQL and Prisma', 'Optimize database queries for multi-million row datasets', 'Collaborate with frontend engineers and DevOps on CI/CD deployments', 'Mentor junior engineers in Dhaka office'],
        requiredSkills: ['Node.js', 'PostgreSQL', 'Prisma', 'Docker', 'REST API', 'TypeScript'],
        preferredSkills: ['Redis', 'AWS', 'SSLCommerz', 'bKash API', 'Kubernetes'],
        experience: { min: 5, max: 10 },
        employmentType: 'FullTime',
        location: 'Gulshan-2, Dhaka (Hybrid: 3 Days Office / 2 Days WFH)',
        salary: { min: 90000, max: 150000, currency: 'BDT', isNegotiable: true },
        status: 'Open',
        totalOpenings: 2,
        applicationCount: 6
      }
    });

    const job2 = await prisma.job.create({
      data: {
        companyId: company.id,
        title: 'Lead UI/UX Product Designer',
        departmentId: desDept.id,
        postedById: hrAdminUser.id,
        description: 'We are looking for a creative Product Designer to lead user research, wireframing, and interactive design for our Bangladesh consumer and enterprise apps.',
        requirements: ['3+ years in product design and UX research', 'Mastery of Figma, Auto Layout, and Design Systems', 'Experience designing for both Bangla and English interfaces', 'Strong portfolio showcasing mobile app and enterprise SaaS flows'],
        responsibilities: ['Lead user research sessions with Bangladeshi merchants and citizens', 'Create interactive high-fidelity Figma prototypes', 'Maintain and scale the DigiBangla Design System'],
        requiredSkills: ['Figma', 'UI/UX Design', 'User Research', 'Design Systems', 'Prototyping'],
        preferredSkills: ['Tailwind CSS', 'Framer', 'Bangla Typography', 'Adobe Illustrator'],
        experience: { min: 3, max: 7 },
        employmentType: 'FullTime',
        location: 'Gulshan-2, Dhaka (On-site)',
        salary: { min: 65000, max: 100000, currency: 'BDT', isNegotiable: true },
        status: 'Open',
        totalOpenings: 1,
        applicationCount: 5
      }
    });

    // Bangladeshi Candidates
    const cand1 = await prisma.candidate.create({
      data: {
        jobId: job1.id, companyId: company.id,
        name: 'Kamruzzaman Bhuiyan',
        email: 'kamruz.bhuiyan@gmail.com', phone: '+880 1715-234501',
        status: 'Interview', source: 'LinkedIn', experience: 6, rating: 5,
        matchScore: 94,
        skillsMatched: ['Node.js', 'PostgreSQL', 'Prisma', 'Docker', 'REST API', 'TypeScript'],
        skillsMissing: ['Kubernetes'],
        currentCompany: 'BJIT Limited', expectedSalary: 120000, noticePeriod: '60 Days',
        notes: [{ text: 'Ex-BJIT developer with 6 years experience. Very solid PostgreSQL knowledge.', createdAt: new Date() }]
      }
    });

    const cand2 = await prisma.candidate.create({
      data: {
        jobId: job1.id, companyId: company.id,
        name: 'Shafayat Hossain Chowdhury',
        email: 'shafayat.h@yahoo.com', phone: '+880 1913-456703',
        status: 'Selected', source: 'Referral', experience: 7, rating: 5,
        matchScore: 98,
        skillsMatched: ['Node.js', 'PostgreSQL', 'Prisma', 'Docker', 'REST API', 'Redis', 'AWS'],
        skillsMissing: [],
        currentCompany: 'Therap (BD) Ltd.', expectedSalary: 135000, noticePeriod: '30 Days',
        notes: [{ text: 'Outstanding technical interview. Cleared all backend rounds with flying colors.', createdAt: new Date() }]
      }
    });

    const cand3 = await prisma.candidate.create({
      data: {
        jobId: job1.id, companyId: company.id,
        name: 'Mahbubur Rahman Polash',
        email: 'mahbub.polash@outlook.com', phone: '+880 1812-345602',
        status: 'Screening', source: 'Indeed', experience: 5, rating: 4,
        matchScore: 82,
        skillsMatched: ['Node.js', 'PostgreSQL', 'REST API', 'Docker'],
        skillsMissing: ['Prisma', 'AWS'],
        currentCompany: 'DataSoft Systems BD Ltd.', expectedSalary: 95000, noticePeriod: '30 Days'
      }
    });

    const cand4 = await prisma.candidate.create({
      data: {
        jobId: job2.id, companyId: company.id,
        name: 'Tania Sultana',
        email: 'tania.sultana.dhk@gmail.com', phone: '+880 1712-678905',
        status: 'Interview', source: 'LinkedIn', experience: 4, rating: 5,
        matchScore: 92,
        skillsMatched: ['Figma', 'UI/UX Design', 'User Research', 'Design Systems', 'Bangla Typography'],
        skillsMissing: ['Framer'],
        currentCompany: 'Shajgoj Limited', expectedSalary: 75000, noticePeriod: '30 Days'
      }
    });

    const cand5 = await prisma.candidate.create({
      data: {
        jobId: job2.id, companyId: company.id,
        name: 'Nafisa Chowdhury',
        email: 'nafisa.chowdhury@hotmail.com', phone: '+880 1914-890107',
        status: 'Applied', source: 'Direct', experience: 3, rating: 4,
        matchScore: 80,
        skillsMatched: ['Figma', 'UI/UX Design', 'Design Systems'],
        skillsMissing: ['Bangla Typography'],
        currentCompany: 'SSL Wireless', expectedSalary: 60000, noticePeriod: '45 Days'
      }
    });

    // Interviews
    const int1 = await prisma.interview.create({
      data: {
        candidateId: cand1.id, jobId: job1.id, companyId: company.id,
        type: 'Technical', status: 'Completed',
        scheduledAt: moment().subtract(2, 'days').hour(11).minute(0).toDate(),
        duration: 60, meetLink: 'https://meet.google.com/dbs-tech-kamruz',
        scheduledById: hrAdminUser.id, location: 'Google Meet',
        feedback: 'Excellent grasp of ACID compliance, database indexing in PostgreSQL, and Prisma schema modeling. Strongly recommended for offer.',
        rating: 9, result: 'Pass',
        criteria: [{ name: 'Database Optimization', score: 9 }, { name: 'System Design', score: 9 }, { name: 'Node.js Internals', score: 9 }]
      }
    });
    await prisma.interviewInterviewer.create({ data: { interviewId: int1.id, userId: ctoUser.id } });

    const int2 = await prisma.interview.create({
      data: {
        candidateId: cand2.id, jobId: job1.id, companyId: company.id,
        type: 'HR', status: 'Completed',
        scheduledAt: moment().subtract(1, 'days').hour(15).minute(0).toDate(),
        duration: 45, meetLink: 'https://meet.google.com/dbs-hr-shafayat',
        scheduledById: hrAdminUser.id, location: 'DigiBangla HQ, Gulshan-2',
        feedback: 'Salary expectation discussed (৳1,35,000 BDT). Culture fit score 10/10. Ready to issue official offer letter.',
        rating: 10, result: 'Pass',
        criteria: [{ name: 'Culture Fit', score: 10 }, { name: 'Communication', score: 10 }, { name: 'Leadership Potential', score: 9 }]
      }
    });
    await prisma.interviewInterviewer.create({ data: { interviewId: int2.id, userId: hrAdminUser.id } });

    const int3 = await prisma.interview.create({
      data: {
        candidateId: cand4.id, jobId: job2.id, companyId: company.id,
        type: 'Video', status: 'Scheduled',
        scheduledAt: moment().add(1, 'days').hour(11).minute(30).toDate(),
        duration: 45, meetLink: 'https://meet.google.com/dbs-design-tania',
        scheduledById: hrAdminUser.id, location: 'Google Meet'
      }
    });
    await prisma.interviewInterviewer.create({ data: { interviewId: int3.id, userId: designMgrUser.id } });

    console.log('✅ Recruitment pipeline seeded: 2 Jobs, 5 Candidates, 3 Interviews');

    // ─── Announcements ────────────────────────────────────────────
    await prisma.announcement.createMany({
      data: [
        {
          companyId: company.id, createdById: hrAdminUser.id,
          title: '🎉 DigiBangla Annual Town Hall & Gala Dinner 2025',
          content: 'Dear Colleagues,\n\nWe are delighted to invite all team members to our Annual Town Hall and Recognition Gala on Thursday at the Grand Ballroom, Pan Pacific Sonargaon, Dhaka starting at 6:30 PM. We will celebrate our achievements on the National Citizen Portal, review the 2026 growth roadmap, and present the Employee of the Year Awards.\n\nPlease confirm your attendance by replying to hr@digibangla.com.bd by Tuesday.',
          type: 'Event', priority: 'High', isPinned: true, targetRoles: ['all']
        },
        {
          companyId: company.id, createdById: hrAdminUser.id,
          title: '🏖️ Official Eid-ul-Fitr & Pohela Boishakh Holiday Notice',
          content: 'As per government gazette and company policy, our offices will remain closed for Eid-ul-Fitr and Pohela Boishakh (Bengali New Year 1432). Employees on critical on-call support duties for the Dhaka City Corporation portal will receive compensatory festival allowances.',
          type: 'Holiday', priority: 'Medium', isPinned: true, targetRoles: ['all']
        },
        {
          companyId: company.id, createdById: hrAdminUser.id,
          title: '📋 Hybrid Work Policy Update (2 Days WFH per week)',
          content: 'Effective 1st of next month, all confirmed employees are eligible for up to 2 days of Work From Home per week. Please ensure you log your attendance and morning check-ins via the HRMS portal on both office and WFH days.',
          type: 'Policy', priority: 'Medium', isPinned: false, targetRoles: ['all']
        },
        {
          companyId: company.id, createdById: ctoUser.id,
          title: '🔐 Mandatory Security & PostgreSQL Backup Training',
          content: 'All engineering and infrastructure staff must review the updated cloud database security protocols and multi-factor authentication (MFA) guidelines by this Friday. This is mandatory for our ISO 27001 compliance audit.',
          type: 'HR', priority: 'High', isPinned: false, targetRoles: ['manager', 'employee']
        }
      ]
    });
    console.log('✅ Announcements seeded');

    // ─── Team Chat Messages ─────────────────────────────────────────
    await prisma.message.createMany({
      data: [
        { senderId: ctoUser.id, receiverId: dev1User.id, companyId: company.id, type: 'direct', content: 'Rakib bhai, did you finalize the Smart NID API integration test on the sandbox server?', isRead: true },
        { senderId: dev1User.id, receiverId: ctoUser.id, companyId: company.id, type: 'direct', content: 'Yes Rafiq bhai, all 50 test cases passed with 100% precision. Pushed the code to main branch.', isRead: true },
        { senderId: ctoUser.id, receiverId: dev1User.id, companyId: company.id, type: 'direct', content: 'Excellent work! Let\'s schedule the client demo for Thursday afternoon at Dhaka City Corporation HQ.', isRead: true },
        { senderId: hrAdminUser.id, receiverId: dev2User.id, companyId: company.id, type: 'direct', content: 'Nusrat apa, please submit your medical prescription scan for the sick leave approval on the HRMS portal.', isRead: true },
        { senderId: dev2User.id, receiverId: hrAdminUser.id, companyId: company.id, type: 'direct', content: 'Uploaded the Ibn Sina medical slip just now apa. Thank you so much for your support!', isRead: true },
        { senderId: hrAdminUser.id, receiverId: dev2User.id, companyId: company.id, type: 'direct', content: 'Approved! Get well soon and please rest properly. 🌸', isRead: true },
        { senderId: salesMgrUser.id, receiverId: mkt1User.id, companyId: company.id, type: 'direct', content: 'Arif bhai, the Eid campaign generated over 2,400 qualified business leads in Dhaka and Chittagong. Outstanding ROI!', isRead: true },
        { senderId: mkt1User.id, receiverId: salesMgrUser.id, companyId: company.id, type: 'direct', content: 'Alhamdulillah Tanvir bhai! The Bangla copywriting and targeted Facebook video reels worked brilliantly.', isRead: false },
        { senderId: dev3User.id, receiverId: ctoUser.id, companyId: company.id, type: 'direct', content: 'Rafiq bhai, the PostgreSQL automated backup script to AWS S3 is running seamlessly with zero latency impact.', isRead: true },
        { senderId: ctoUser.id, receiverId: dev3User.id, companyId: company.id, type: 'direct', content: 'Great job Sabbir! Make sure Masum runs the automated recovery drill this weekend.', isRead: false },
      ]
    });
    console.log('✅ Team messages seeded');

    // ─── Documents ────────────────────────────────────────────────
    await prisma.document.createMany({
      data: [
        { companyId: company.id, uploadedById: hrAdminUser.id, name: 'DigiBangla Employee Code of Conduct 2025', type: 'Other', isPublic: true, description: 'Official company guidelines, workplace ethics, and employee benefits in Bangladesh.', fileUrl: '/uploads/documents/employee-handbook-2025.pdf', fileName: 'employee-handbook-2025.pdf', fileSize: 2450000, mimeType: 'application/pdf', tags: ['HR', 'Policy', 'Handbook'] },
        { companyId: company.id, uploadedById: hrAdminUser.id, name: 'Bangladesh Labor Act Compliance Summary', type: 'Other', isPublic: true, description: 'Statutory rules regarding working hours, overtime pay, and festival holidays.', fileUrl: '/uploads/documents/labor-law-compliance.pdf', fileName: 'labor-law-compliance.pdf', fileSize: 580000, mimeType: 'application/pdf', tags: ['Legal', 'Compliance', 'Labor Law'] },
        { companyId: company.id, uploadedById: hrAdminUser.id, employeeId: dev1Emp.id, name: 'Md. Rakibul Hasan — Appointment Letter', type: 'Contract', isPublic: false, description: 'Official employment agreement signed February 2020.', fileUrl: '/uploads/documents/appointment-dbs005.pdf', fileName: 'appointment-dbs005.pdf', fileSize: 920000, mimeType: 'application/pdf', tags: ['Contract', 'Appointment'] },
        { companyId: company.id, uploadedById: hrAdminUser.id, employeeId: dev2Emp.id, name: 'Nusrat Jahan — Ibn Sina Medical Certificate', type: 'Certificate', isPublic: false, description: 'Doctor certified sick leave document.', fileUrl: '/uploads/documents/medical-nusrat.pdf', fileName: 'medical-nusrat.pdf', fileSize: 310000, mimeType: 'application/pdf', tags: ['Medical', 'Leave'] },
        { companyId: company.id, uploadedById: ctoUser.id, name: 'National Citizen Portal Architecture Blueprint v2.1', type: 'Other', isPublic: false, description: 'High-level system design, database ERD, and API specifications.', fileUrl: '/uploads/documents/portal-architecture-v2.pdf', fileName: 'portal-architecture-v2.pdf', fileSize: 4200000, mimeType: 'application/pdf', tags: ['Technical', 'Architecture', 'PostgreSQL'] },
        { companyId: company.id, uploadedById: hrAdminUser.id, name: 'Executive Salary Scale Matrix 2025 (BDT)', type: 'SalarySlip', isPublic: false, description: 'Internal grade matrix and allowance breakdown for compensation reviews.', fileUrl: '/uploads/documents/salary-scale-2025.pdf', fileName: 'salary-scale-2025.pdf', fileSize: 410000, mimeType: 'application/pdf', tags: ['HR', 'Compensation', 'Payroll'] }
      ]
    });
    console.log('✅ Documents seeded');

    // ─── Notifications ─────────────────────────────────────────────
    await prisma.notification.createMany({
      data: [
        { userId: dev2User.id, companyId: company.id, type: 'leave_approved', title: 'Leave Approved ✅', message: 'Your sick leave application for this week has been approved by HR.', link: '/leaves', isRead: false },
        { userId: dev1User.id, companyId: company.id, type: 'task_assigned', title: 'New Task Assigned 📋', message: 'CTO assigned: "Implement Bangladesh Smart NID Verification API"', link: '/tasks', isRead: false },
        { userId: dev1User.id, companyId: company.id, type: 'review_submitted', title: 'Performance Review Complete 🎯', message: 'Your Q2-2025 Performance Review is finalized: Overall Rating 8.85/10 (Excellent)', link: '/performance', isRead: false },
        { userId: mkt1User.id, companyId: company.id, type: 'payroll_generated', title: 'Salary Credited ৳', message: 'Your salary for last month has been processed and deposited to your bank account.', link: '/payroll', isRead: true },
        { userId: hrAdminUser.id, companyId: company.id, type: 'leave_applied', title: 'New Leave Request', message: 'Rakibul Hasan applied for 2 days Casual Leave (Wedding in Sylhet).', link: '/leaves', isRead: false },
        { userId: ctoUser.id, companyId: company.id, type: 'interview_scheduled', title: 'Interview Scheduled 📅', message: 'Technical interview with Kamruzzaman Bhuiyan on Google Meet.', link: '/recruitment', isRead: true },
        { userId: qa1User.id, companyId: company.id, type: 'task_assigned', title: 'New Task Assigned 📋', message: 'Assigned to stress test the Citizen Portal against 10k concurrent requests.', link: '/tasks', isRead: false }
      ]
    });
    console.log('✅ Notifications seeded');

    // ─── Cryptographic Keys (Master Enterprise RSA & ECC Keypairs) ───
    const rsaKeys = generateRSAKeyPair(512);
    const eccKeys = generateECCKeyPair();

    await prisma.cryptographicKey.create({
      data: {
        key_id: 'master-rsa-encryption-key-01',
        algorithm: 'RSA',
        purpose: 'encryption',
        companyId: company.id,
        public_key: JSON.stringify(rsaKeys.publicKey),
        protected_private_key: JSON.stringify(rsaKeys.privateKey),
        status: 'active',
        rotation_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        metadata: { keySize: 512, isMaster: true }
      }
    });

    await prisma.cryptographicKey.create({
      data: {
        key_id: 'master-ecc-signature-key-01',
        algorithm: 'ECC',
        purpose: 'signature',
        companyId: company.id,
        public_key: JSON.stringify(eccKeys.publicKey),
        protected_private_key: JSON.stringify(eccKeys.privateKey),
        status: 'active',
        rotation_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        metadata: { curve: 'secp256k1', isMaster: true }
      }
    });
    console.log('✅ Enterprise Cryptographic Keys (RSA & ECC) seeded');

    // ─── Hash-Chained Cryptographic Audit Logs ────────────────────────
    const rawAuditLogs = [
      { userId: hrAdminUser.id, companyId: company.id, action: 'LOGIN', entity: 'User', entityId: hrAdminUser.id, description: 'HR Admin logged in from IP 103.108.140.22 (Dhaka, Bangladesh)', ipAddress: '103.108.140.22', userAgent: 'Mozilla/5.0 Chrome/126.0', status: 'success' },
      { userId: hrAdminUser.id, companyId: company.id, action: 'CREATE', entity: 'Payroll', description: 'Generated monthly payroll for 10 employees (Total disbursement: ৳7,86,400 BDT)', ipAddress: '103.108.140.22', userAgent: 'Mozilla/5.0 Chrome/126.0', status: 'success' },
      { userId: hrAdminUser.id, companyId: company.id, action: 'APPROVE', entity: 'Leave', description: 'Approved 2-day sick leave for Nusrat Jahan (Medical certificate verified)', ipAddress: '103.108.140.22', userAgent: 'Mozilla/5.0 Chrome/126.0', status: 'success' },
      { userId: ctoUser.id, companyId: company.id, action: 'CREATE', entity: 'Project', description: 'Initiated new project: "Dhaka City Citizen Services Digital Platform"', ipAddress: '103.74.196.10', userAgent: 'Mozilla/5.0 Chrome/126.0', status: 'success' },
      { userId: ctoUser.id, companyId: company.id, action: 'CREATE', entity: 'Review', description: 'Submitted quarterly performance evaluation for Md. Rakibul Hasan', ipAddress: '103.74.196.10', userAgent: 'Mozilla/5.0 Chrome/126.0', status: 'success' },
      { userId: hrAdminUser.id, companyId: company.id, action: 'CREATE', entity: 'Job', description: 'Published job opening: "Senior Backend Engineer (Node.js, PostgreSQL & Prisma)"', ipAddress: '103.108.140.22', userAgent: 'Mozilla/5.0 Chrome/126.0', status: 'success' },
      { userId: dev1User.id, companyId: company.id, action: 'LOGIN', entity: 'User', entityId: dev1User.id, description: 'Engineer logged in from IP 103.135.72.44 (Dhaka, Bangladesh)', ipAddress: '103.135.72.44', userAgent: 'Mozilla/5.0 Chrome/126.0', status: 'success' }
    ];

    let prevHash = '0000000000000000000000000000000000000000000000000000000000000000';
    for (const logItem of rawAuditLogs) {
      const payload = JSON.stringify({
        prevHash,
        userId: logItem.userId,
        companyId: logItem.companyId,
        action: logItem.action,
        entity: logItem.entity,
        description: logItem.description,
        timestamp: new Date().toISOString()
      });
      const current_hash = crypto.createHash('sha256').update(payload).digest('hex');
      const mac_value = generateMAC(current_hash);
      const log_signature = signMessage(current_hash, eccKeys.privateKey);

      await prisma.auditLog.create({
        data: {
          ...logItem,
          previous_hash: prevHash,
          current_hash,
          mac_value,
          log_signature
        }
      });
      prevHash = current_hash;
    }
    console.log('✅ Hash-chained cryptographic audit logs seeded');

    console.log('\n========================================================================');
    console.log('🇧🇩  BANGLADESHI DEMO DATA SEEDED ACROSS ALL MODULES SUCCESSFULLY!  🇧🇩');
    console.log('========================================================================');
    console.log('🏢 Company       : DigiBangla Solutions Ltd. (Gulshan-2, Dhaka)');
    console.log('👥 Employees     : 10 Bangladeshi Staff (BUET, DU, IBA, BRACU, SUST alumni)');
    console.log('🏛️ Departments   : 4 (Engineering, HR, Product Design, Sales & Marketing)');
    console.log('📊 Attendance    : 220 Records (Sun-Thu Bangladesh working week)');
    console.log('💰 Payroll (BDT) : 20 Monthly Slips with BEFTN bank transfers & tax deductions');
    console.log('📁 Projects      : 3 (Dhaka Citizen Portal, BDWallet, Shurjo B2B)');
    console.log('📋 Kanban Tasks  : 10 Tasks with Smart NID, SSLCommerz, bKash & Bangla UI');
    console.log('🎯 Reviews       : 3 Quarterly Performance Evaluations');
    console.log('💼 Recruitment   : 2 Job Posts, 5 Candidates, 3 Interview Schedules');
    console.log('📢 Announcements : 4 Notices (Town Hall at Pan Pacific Sonargaon, Eid Holiday)');
    console.log('💬 Messages      : 10 Direct Chat Conversations');
    console.log('📄 Documents     : 6 PDF/Policy Files');
    console.log('🔔 Notifications : 7 Alerts');
    console.log('📜 Audit Logs    : 7 Security Activity Logs');
    console.log('\n--- 🔑 Login Credentials (password: password123) ---');
    console.log('1. Super Admin   : admin@hrms.com');
    console.log('2. HR Admin      : fatema@digibangla.com.bd  OR  hr@nexustech.io');
    console.log('3. CTO / Manager : rafiq@digibangla.com.bd');
    console.log('4. Senior Dev    : rakib@digibangla.com.bd');
    console.log('5. Frontend Dev  : nusrat@digibangla.com.bd');
    console.log('========================================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeder Error:', error);
    process.exit(1);
  }
};

seedData();
