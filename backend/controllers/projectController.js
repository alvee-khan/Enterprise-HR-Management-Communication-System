import prisma from '../config/prisma.js';

export const getProjects = async (req, res, next) => {
  try {
    const where = { companyId: req.user.companyId };
    const { status } = req.query;
    if (status) where.status = status;

    const projects = await prisma.project.findMany({
      where,
      include: {
        manager: { select: { id: true, name: true, email: true, profileImage: true } },
        members: {
          include: {
            employee: { select: { id: true, name: true, email: true, profileImage: true } }
          }
        },
        tasks: {
          select: { id: true, status: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const withCounts = projects.map((p) => {
      const tasks = p.tasks || [];
      const total = tasks.length;
      const completed = tasks.filter(t => t.status === 'Completed').length;
      const progress = total ? Math.round((completed / total) * 100) : (p.progress || 0);

      const taskStats = [
        { _id: 'Todo', count: tasks.filter(t => t.status === 'Todo').length },
        { _id: 'InProgress', count: tasks.filter(t => t.status === 'InProgress').length },
        { _id: 'Review', count: tasks.filter(t => t.status === 'Review').length },
        { _id: 'Completed', count: completed }
      ];

      const membersList = p.members.map(m => m.employee);

      return {
        ...p,
        members: membersList,
        taskStats,
        progress
      };
    });

    res.status(200).json({ success: true, data: withCounts });
  } catch (error) { next(error); }
};

export const createProject = async (req, res, next) => {
  try {
    const { managerId, members, startDate, endDate, ...rest } = req.body;
    const project = await prisma.project.create({
      data: {
        ...rest,
        companyId: req.user.companyId,
        managerId: managerId ? Number(managerId) : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        tags: req.body.tags || [],
        members: Array.isArray(members) && members.length > 0 ? {
          create: members.map(empId => ({ employeeId: Number(empId) }))
        } : undefined
      },
      include: {
        manager: { select: { id: true, name: true, email: true } },
        members: { include: { employee: { select: { id: true, name: true, email: true, profileImage: true } } } }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Project created',
      data: { ...project, members: project.members.map(m => m.employee) }
    });
  } catch (error) { next(error); }
};

export const updateProject = async (req, res, next) => {
  try {
    const { managerId, members, startDate, endDate, ...rest } = req.body;
    const updateData = {
      ...rest,
      managerId: managerId ? Number(managerId) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined
    };
    delete updateData.companyId;

    if (Array.isArray(members)) {
      await prisma.projectMember.deleteMany({ where: { projectId: Number(req.params.id) } });
      updateData.members = {
        create: members.map(empId => ({ employeeId: Number(empId) }))
      };
    }

    const project = await prisma.project.update({
      where: { id: Number(req.params.id) },
      data: updateData,
      include: {
        manager: { select: { id: true, name: true, email: true } },
        members: { include: { employee: { select: { id: true, name: true, email: true, profileImage: true } } } }
      }
    });

    res.status(200).json({
      success: true,
      data: { ...project, members: project.members.map(m => m.employee) }
    });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Project not found' });
    next(error);
  }
};

export const deleteProject = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await prisma.projectMember.deleteMany({ where: { projectId: id } });
    await prisma.task.deleteMany({ where: { projectId: id } });
    await prisma.project.delete({ where: { id } });
    res.status(200).json({ success: true, message: 'Project deleted' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Project not found' });
    next(error);
  }
};
