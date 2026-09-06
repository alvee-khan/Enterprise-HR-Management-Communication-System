import prisma from '../config/prisma.js';
import { createAuditLog } from '../utils/auditLogger.js';

export const getDepartments = async (req, res, next) => {
  try {
    let companyId = req.user.companyId;
    if (!companyId && req.user.role === 'superAdmin') {
      const firstCompany = await prisma.company.findFirst({ where: { isActive: true } });
      companyId = firstCompany?.id;
    }

    let departments = await prisma.department.findMany({
      where: companyId ? { companyId, isActive: true } : { isActive: true },
      include: {
        manager: { select: { name: true, email: true, profileImage: true, designation: true } },
        parentDept: { select: { name: true } }
      }
    });

    // Auto-provision standard starter departments if company has none
    if (departments.length === 0 && companyId) {
      const defaultDepts = [
        { name: 'Engineering', code: 'ENG', description: 'Software, systems and product engineering' },
        { name: 'Human Resources', code: 'HR', description: 'People operations, recruitment, and culture' },
        { name: 'Sales & Marketing', code: 'MKT', description: 'Business development, client relations, and marketing' },
        { name: 'Finance & Operations', code: 'OPS', description: 'Financial accounting, compliance, and office operations' }
      ];

      for (const d of defaultDepts) {
        await prisma.department.create({
          data: {
            name: d.name,
            code: d.code,
            description: d.description,
            companyId,
            isActive: true
          }
        });
      }

      departments = await prisma.department.findMany({
        where: { companyId, isActive: true },
        include: {
          manager: { select: { name: true, email: true, profileImage: true, designation: true } },
          parentDept: { select: { name: true } }
        }
      });
    }

    // Add employee count to each dept
    const deptWithCount = await Promise.all(departments.map(async (dept) => {
      const count = await prisma.employee.count({ where: { departmentId: dept.id, status: 'Active' } });
      return { ...dept, employeeCount: count };
    }));

    res.status(200).json({ success: true, data: deptWithCount });
  } catch (error) {
    next(error);
  }
};

export const getDepartment = async (req, res, next) => {
  try {
    const dept = await prisma.department.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        manager: { select: { name: true, email: true, profileImage: true, designation: true } },
        parentDept: { select: { name: true } }
      }
    });
    if (!dept) return res.status(404).json({ success: false, message: 'Department not found' });

    const employees = await prisma.employee.findMany({
      where: { departmentId: dept.id, status: 'Active' },
      select: { id: true, name: true, email: true, profileImage: true, designation: true,
        manager: { select: { name: true } }
      }
    });

    res.status(200).json({ success: true, data: { ...dept, employees } });
  } catch (error) {
    next(error);
  }
};

export const createDepartment = async (req, res, next) => {
  try {
    const { name, code, description, managerId, parentDeptId, budget, location, color } = req.body;
    const dept = await prisma.department.create({
      data: {
        name, code, description,
        companyId: req.user.companyId,
        managerId: managerId ? Number(managerId) : null,
        parentDeptId: parentDeptId ? Number(parentDeptId) : null,
        budget: budget || 0,
        location, color: color || '#6366f1'
      }
    });
    await createAuditLog({ userId: req.user.id, companyId: req.user.companyId, action: 'CREATE', entity: 'Department', entityId: dept.id, description: `Created department ${dept.name}`, req });
    res.status(201).json({ success: true, message: 'Department created', data: dept });
  } catch (error) {
    next(error);
  }
};

export const updateDepartment = async (req, res, next) => {
  try {
    const updateData = { ...req.body };
    if (updateData.managerId) updateData.managerId = Number(updateData.managerId);
    if (updateData.parentDeptId) updateData.parentDeptId = Number(updateData.parentDeptId);
    delete updateData.companyId;

    const dept = await prisma.department.update({
      where: { id: Number(req.params.id) },
      data: updateData,
      include: { manager: { select: { name: true, email: true, profileImage: true } } }
    });
    await createAuditLog({ userId: req.user.id, companyId: req.user.companyId, action: 'UPDATE', entity: 'Department', entityId: dept.id, description: `Updated department ${dept.name}`, req });
    res.status(200).json({ success: true, message: 'Department updated', data: dept });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Department not found' });
    next(error);
  }
};

export const deleteDepartment = async (req, res, next) => {
  try {
    const empCount = await prisma.employee.count({ where: { departmentId: Number(req.params.id), status: 'Active' } });
    if (empCount > 0) {
      return res.status(400).json({ success: false, message: `Cannot delete: ${empCount} active employees in this department` });
    }
    await prisma.department.update({ where: { id: Number(req.params.id) }, data: { isActive: false } });
    res.status(200).json({ success: true, message: 'Department deleted' });
  } catch (error) {
    next(error);
  }
};

export const getOrgChart = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const departments = await prisma.department.findMany({
      where: { companyId, isActive: true },
      include: { manager: { select: { name: true, email: true, profileImage: true, designation: true } } }
    });

    const orgData = await Promise.all(departments.map(async (dept) => {
      const employees = await prisma.employee.findMany({
        where: { departmentId: dept.id, status: 'Active' },
        select: {
          id: true, name: true, email: true, profileImage: true, designation: true, managerId: true,
          manager: { select: { name: true, profileImage: true } }
        }
      });
      return { ...dept, employees };
    }));

    res.status(200).json({ success: true, data: orgData });
  } catch (error) {
    next(error);
  }
};
