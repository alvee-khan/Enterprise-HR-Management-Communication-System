import prisma from '../config/prisma.js';
import { createNotification } from '../utils/notificationHelper.js';

export const getTasks = async (req, res, next) => {
  try {
    const { projectId, status, assigneeId, priority } = req.query;
    const where = { companyId: req.user.companyId };

    if (req.user.role === 'employee') {
      const emp = await prisma.employee.findFirst({ where: { user: { id: req.user.id } } });
      if (emp) where.assigneeId = emp.id;
    } else {
      if (assigneeId) where.assigneeId = Number(assigneeId);
    }

    if (projectId) where.projectId = Number(projectId);
    if (status) where.status = status;
    if (priority) where.priority = priority;

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: { select: { id: true, name: true, email: true, profileImage: true } },
        project: { select: { id: true, name: true, color: true } },
        assignedBy: { select: { id: true, name: true } }
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }]
    });

    res.status(200).json({ success: true, data: tasks });
  } catch (error) { next(error); }
};

export const getKanbanTasks = async (req, res, next) => {
  try {
    const { projectId } = req.query;
    const where = { companyId: req.user.companyId };
    if (projectId) where.projectId = Number(projectId);

    if (req.user.role === 'employee') {
      const emp = await prisma.employee.findFirst({ where: { user: { id: req.user.id } } });
      if (emp) where.assigneeId = emp.id;
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: { select: { id: true, name: true, profileImage: true } },
        project: { select: { id: true, name: true, color: true } }
      },
      orderBy: { position: 'asc' }
    });

    const kanban = {
      'Todo': tasks.filter(t => t.status === 'Todo'),
      'In Progress': tasks.filter(t => t.status === 'InProgress'),
      'Review': tasks.filter(t => t.status === 'Review'),
      'Completed': tasks.filter(t => t.status === 'Completed')
    };

    res.status(200).json({ success: true, data: kanban });
  } catch (error) { next(error); }
};

export const createTask = async (req, res, next) => {
  try {
    const { projectId, assigneeId, deadline, ...rest } = req.body;
    const task = await prisma.task.create({
      data: {
        ...rest,
        projectId: projectId ? Number(projectId) : null,
        assigneeId: assigneeId ? Number(assigneeId) : null,
        assignedById: req.user.id,
        companyId: req.user.companyId,
        deadline: deadline ? new Date(deadline) : null,
        comments: req.body.comments || [],
        subtasks: req.body.subtasks || [],
        tags: req.body.tags || [],
        checklist: req.body.checklist || []
      }
    });

    // Notify assignee
    if (assigneeId) {
      const employee = await prisma.employee.findUnique({
        where: { id: Number(assigneeId) },
        include: { user: { select: { id: true } } }
      });
      if (employee?.user?.id) {
        await createNotification({
          userId: employee.user.id,
          companyId: req.user.companyId,
          type: 'task_assigned',
          title: 'New Task Assigned',
          message: `You have been assigned: "${req.body.title}"`,
          link: `/tasks/${task.id}`
        });
      }
    }

    const populated = await prisma.task.findUnique({
      where: { id: task.id },
      include: {
        assignee: { select: { id: true, name: true, profileImage: true } },
        project: { select: { id: true, name: true, color: true } },
        assignedBy: { select: { id: true, name: true } }
      }
    });

    res.status(201).json({ success: true, message: 'Task created', data: populated });
  } catch (error) { next(error); }
};

export const updateTask = async (req, res, next) => {
  try {
    const updateData = { ...req.body };
    if (updateData.projectId) updateData.projectId = Number(updateData.projectId);
    if (updateData.assigneeId) updateData.assigneeId = Number(updateData.assigneeId);
    if (updateData.deadline) updateData.deadline = new Date(updateData.deadline);
    if (updateData.status === 'Completed' || updateData.status === 'InProgress') {
      if (updateData.status === 'Completed') updateData.completedAt = new Date();
    }
    delete updateData.companyId;

    const task = await prisma.task.update({
      where: { id: Number(req.params.id) },
      data: updateData,
      include: {
        assignee: { select: { id: true, name: true, profileImage: true } },
        project: { select: { id: true, name: true, color: true } }
      }
    });

    res.status(200).json({ success: true, data: task });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Task not found' });
    next(error);
  }
};

export const updateTaskStatus = async (req, res, next) => {
  try {
    const { status, position } = req.body;
    const updates = {};
    if (status) {
      updates.status = status;
      if (status === 'Completed') updates.completedAt = new Date();
    }
    if (position !== undefined) updates.position = Number(position);

    const task = await prisma.task.update({
      where: { id: Number(req.params.id) },
      data: updates,
      include: {
        assignee: { select: { id: true, name: true, profileImage: true } },
        project: { select: { id: true, name: true, color: true } }
      }
    });

    res.status(200).json({ success: true, data: task });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Task not found' });
    next(error);
  }
};

export const deleteTask = async (req, res, next) => {
  try {
    await prisma.task.delete({ where: { id: Number(req.params.id) } });
    res.status(200).json({ success: true, message: 'Task deleted' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Task not found' });
    next(error);
  }
};

export const addComment = async (req, res, next) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: Number(req.params.id) } });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const comments = Array.isArray(task.comments) ? task.comments : [];
    const newComment = {
      user: { id: req.user.id, name: req.user.name, profileImage: req.user.profileImage },
      text: req.body.text,
      createdAt: new Date()
    };
    comments.push(newComment);

    const updated = await prisma.task.update({
      where: { id: task.id },
      data: { comments },
      include: {
        assignee: { select: { id: true, name: true, profileImage: true } },
        project: { select: { id: true, name: true, color: true } }
      }
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) { next(error); }
};
