import express from 'express';
import { protect } from '../middleware/auth.js';
import prisma from '../config/prisma.js';

const router = express.Router();
router.use(protect);

// Skill Matrix for a department or company
router.get('/', async (req, res, next) => {
  try {
    const { departmentId } = req.query;
    const where = { companyId: req.user.companyId, status: 'Active' };
    if (departmentId) where.departmentId = Number(departmentId);

    const employees = await prisma.employee.findMany({
      where,
      select: {
        id: true,
        name: true,
        profileImage: true,
        skills: true,
        designation: true,
        department: { select: { id: true, name: true, color: true } }
      }
    });

    // Aggregate all unique skills
    const skillMap = {};
    employees.forEach(emp => {
      const skillsArr = Array.isArray(emp.skills) ? emp.skills : [];
      skillsArr.forEach(skill => {
        if (skill && skill.name) {
          if (!skillMap[skill.name]) skillMap[skill.name] = [];
          skillMap[skill.name].push({ employee: emp.name, level: skill.level });
        }
      });
    });

    res.status(200).json({ success: true, data: { employees, skillMap } });
  } catch (error) { next(error); }
});

// Update employee skills
router.put('/employee/:id', async (req, res, next) => {
  try {
    const emp = await prisma.employee.update({
      where: { id: Number(req.params.id) },
      data: { skills: req.body.skills }
    });
    res.status(200).json({ success: true, data: emp?.skills });
  } catch (error) { next(error); }
});

export default router;
