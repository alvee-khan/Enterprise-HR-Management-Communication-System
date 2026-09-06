import prisma from '../config/prisma.js';
import { createAuditLog } from '../utils/auditLogger.js';

export const getCompanies = async (req, res, next) => {
  try {
    const companies = await prisma.company.findMany({
      where: { isActive: true },
      include: { admin: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ success: true, data: companies });
  } catch (error) { next(error); }
};

export const getCompany = async (req, res, next) => {
  try {
    const id = Number(req.params.id || req.user.companyId);
    const company = await prisma.company.findUnique({
      where: { id },
      include: { admin: { select: { name: true, email: true } } }
    });
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    res.status(200).json({ success: true, data: company });
  } catch (error) { next(error); }
};

export const createCompany = async (req, res, next) => {
  try {
    const { name, email, phone, website, address, industry, size, founded, description } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

    const company = await prisma.company.create({
      data: { name, slug, email, phone, website, address, industry, size, founded, description }
    });
    await createAuditLog({ userId: req.user.id, action: 'CREATE', entity: 'Company', entityId: company.id, description: `Created company ${company.name}`, req });
    res.status(201).json({ success: true, data: company });
  } catch (error) { next(error); }
};

export const updateCompany = async (req, res, next) => {
  try {
    const company = await prisma.company.update({
      where: { id: Number(req.params.id) },
      data: req.body
    });
    res.status(200).json({ success: true, data: company });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Company not found' });
    next(error);
  }
};

export const deleteCompany = async (req, res, next) => {
  try {
    await prisma.company.update({ where: { id: Number(req.params.id) }, data: { isActive: false } });
    res.status(200).json({ success: true, message: 'Company deactivated' });
  } catch (error) { next(error); }
};
