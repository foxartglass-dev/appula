import express, { Request, Response } from 'express';
import { config, validateConfig } from '../config/env';

const app = express();

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    service: 'Appula',
    timestamp: new Date().toISOString(),
  });
});

// Version endpoint
app.get('/version', (_req: Request, res: Response) => {
  res.json({
    version: '0.0.1-phase1',
    name: 'appula-core',
    phase: 1,
    description: 'Phase 1: Project skeleton with stub implementations',
  });
});

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'Appula',
    version: '0.0.1-phase1',
    endpoints: {
      health: '/health',
      version: '/version',
    },
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
  });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: Function) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

/**
 * Start the Express server
 */
export function startServer(): void {
  try {
    validateConfig();

    const port = config.port;

    app.listen(port, () => {
      console.log('╔═══════════════════════════════════════════╗');
      console.log('║           Appula Server Started           ║');
      console.log('╚═══════════════════════════════════════════╝');
      console.log('');
      console.log(`  Server:  http://localhost:${port}`);
      console.log(`  Health:  http://localhost:${port}/health`);
      console.log(`  Version: http://localhost:${port}/version`);
      console.log('');
      console.log('  Phase 1: Skeleton implementation');
      console.log('  Status: Ready (no actual AI calls)');
      console.log('');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start server if this file is run directly
if (require.main === module) {
  startServer();
}

export default app;
