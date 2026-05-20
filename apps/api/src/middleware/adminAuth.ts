import type { Request, Response, NextFunction } from 'express';

export function adminAuth(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) {
    res.status(503).json({ error: 'ADMIN_DISABLED', message: 'ADMIN_TOKEN not configured.' });
    return;
  }

  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : (req.headers['x-admin-token'] as string | undefined);

  if (!token || token !== expected) {
    res.status(401).json({ error: 'UNAUTHORIZED' });
    return;
  }

  next();
}
