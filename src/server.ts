import express, { Request, Response, NextFunction } from 'express';
import { createParrotAgent } from './parrot-agent';
import { 
  validateAndParsePayload
} from '@openfloor/protocol';

const app = express();
app.use(express.json());

// Create the parrot agent instance
const parrotAgent = createParrotAgent({
  speakerUri: 'tag:openfloor-demo.com,2025:parrot-agent',
  serviceUrl: process.env.SERVICE_URL || 'https://your-app-runner-url.amazonaws.com',
  name: 'Polly the Parrot',
  organization: 'OpenFloor Demo Corp',
  description: 'A friendly parrot that repeats everything you say!'
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy', 
    agent: 'parrot-agent',
    timestamp: new Date().toISOString()
  });
});

// Get agent manifest
app.get('/manifest', (req: Request, res: Response) => {
  try {
    const manifest = (parrotAgent as any).manifest.toObject();
    res.json(manifest);
  } catch (error) {
    console.error('Error getting manifest:', error);
    res.status(500).json({ error: 'Failed to get manifest' });
  }
});

// Main OpenFloor Protocol endpoint
app.post('/', async (req: Request, res: Response) => {
  try {
    console.log('Received request:', JSON.stringify(req.body, null, 2));

    // Validate and parse the incoming payload
    const validationResult = validateAndParsePayload(JSON.stringify(req.body));
    
    if (!validationResult.valid) {
      console.error('Validation errors:', validationResult.errors);
      return res.status(400).json({
        error: 'Invalid OpenFloor payload',
        details: validationResult.errors
      });
    }

    const payload = validationResult.payload!;
    const inEnvelope = payload.openFloor;

    console.log('Processing envelope from:', inEnvelope.sender.speakerUri);

    // Process the envelope through the parrot agent
    const outEnvelope = await parrotAgent.processEnvelope(inEnvelope);

    // Create response payload
    const responsePayload = outEnvelope.toPayload();
    const response = responsePayload.toObject();

    console.log('Sending response:', JSON.stringify(response, null, 2));

    res.json(response);

  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Error handling middleware
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message
  });
});

export default app;
