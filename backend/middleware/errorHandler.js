export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Prisma Unique Constraint Violation
  if (err.code === 'P2002') {
    statusCode = 400;
    const target = err.meta?.target ? ` for field: ${Array.isArray(err.meta.target) ? err.meta.target.join(', ') : err.meta.target}` : '';
    message = `Duplicate value error${target}`;
  }

  // Prisma Record Not Found
  if (err.code === 'P2025') {
    statusCode = 404;
    message = err.meta?.cause || 'Resource not found';
  }

  // Prisma Foreign Key Constraint Violation
  if (err.code === 'P2003') {
    statusCode = 400;
    message = `Invalid reference in relational field`;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}
