
# Building an Open Floor Parrot Agent

In this short guide, we will build a simple parrot agent together. The parrot agent will simply repeat everything you send him and a small 🦜 emoji in front of the return. We will create the [Open Floor Protocol](https://github.com/open-voice-interoperability/openfloor-docs)-compliant agent with the help of the [@openfloor/protocol](https://www.npmjs.com/package/@openfloor/protocol) package.

## Initial Setup

First, let's set up our project by creating the project folder and installing the required packages:

```bash
mkdir parrot-agent
cd parrot-agent
npm init -y
npm install express @openfloor/protocol
npm  install -D typescript @types/node @types/express ts-node
```

We will also need a TypeScript configuration file, so create `tsconfig.json` and add the following content:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

Now that the basic set up is done, let us start coding together!

## Step 1: Building the Parrot Agent Class
Before we create our parrot agent class, let's create a new folder `src` where we will store all of our files.

Create a new file `src/parrot-agent.ts`, this will contain the main logic of our agent.

### Step 1.1: Add the imports

Lets start with the import of everything we need from the `@openfloor/protocol` package, add them at the top of your `parrot-agent.ts` file:

```typescript
import { 
  BotAgent, 
  ManifestOptions, 
  UtteranceEvent, 
  Envelope,
  createTextUtterance,
  isUtteranceEvent
} from '@openfloor/protocol';
```

**Why these imports?**

-   `BotAgent` - The base class we'll extend
-   `ManifestOptions` - To define our agent's capabilities
-   `UtteranceEvent` - The type of event we'll handle
-   `Envelope` - Container for Open Floor messages
-   `createTextUtterance` - Helper to create text responses
-   `isUtteranceEvent` - To check if an event is an utterance

### Step 1.2: Start the ParrotAgent class

Now let's start creating our `ParrotAgent` class by extending the `BotAgent`:

```typescript
/**
 * ParrotAgent - A simple agent that echoes back whatever it receives
 * Extends BotAgent to provide parrot functionality
 */
export class ParrotAgent extends BotAgent {
  constructor(manifest: ManifestOptions) {
    super(manifest);
  }
```

**What we just did:**
-   Created a class that extends `BotAgent`
-   Added a constructor that takes a manifest and passes it to the parent class
-   The manifest will define what our agent can do

### Step 1.3: Override the processEnvelope method

The `processEnvelope` method of the `BotAgent` class is the main entry point for agent message processing. So, this is where the magic happens:

```typescript
  /**
   * Override the processEnvelope method to handle parrot functionality
   */
  async processEnvelope(incomingEnvelope: Envelope): Promise<Envelope> {
```

Now let's build the method body step by step. First, create an array to store our responses:

```typescript
    const responseEvents: any[] = [];
```

Next, we loop through each event in the incoming envelope:

```typescript
    for (const event of incomingEnvelope.events) {
```

We also should check if this event is meant for us. So, add this inside the loop:

```typescript
      // Check if this event is addressed to us
      const addressedToMe = !event.to || 
        event.to.speakerUri === this.speakerUri || 
        event.to.serviceUrl === this.serviceUrl;
```

**Why this check?**
-   `!event.to` - If no recipient is specified, it's for everyone.
-   `event.to.speakerUri === this.speakerUri` - Direct message to us
-   `event.to.serviceUrl === this.serviceUrl` - Message to our service

With this check, we know the event is really meant for us, and we can now handle the two types of events we care about:

```typescript
      if (addressedToMe && isUtteranceEvent(event)) {
        const responseEvent = await this._handleParrotUtterance(event, incomingEnvelope);
        if (responseEvent) responseEvents.push(responseEvent);
      } else if (addressedToMe && event.eventType === 'getManifests') {
        // We respond to the getManifests event with the publishManifest event
        responseEvents.push({
          eventType: 'publishManifest',
          // We use the senders speakerUri as the recipient
          to: { speakerUri: incomingEnvelope.sender.speakerUri },
          parameters: {
            servicingManifests: [this.manifest.toObject()]
          }
        });
      }
```

**What's happening here:**
-   If it's a text message (utterance), we'll handle it with our parrot logic
-   If someone asks for our capabilities via the `getManifests` event, we send back our manifest

To finish the method, we can now close the loop and return an envelope as a response with all the required response events:

```typescript
    }

    // Create response envelope with all response events
    return new Envelope({
      schema: { version: incomingEnvelope.schema.version },
      conversation: { id: incomingEnvelope.conversation.id },
      sender: {
        speakerUri: this.speakerUri,
        serviceUrl: this.serviceUrl
      },
      events: responseEvents
    });
  }
```

### Step 1.4: Implement the parrot logic

You saw in the `processEnvelope` method that we call a yet undefined `_handleParrotUtterance`, this is the private method we will now implement to echo back what we got sent via the `utterance` event:

```typescript
  /**
   * Handle utterance events by echoing them back
   */
  private async _handleParrotUtterance(
    event: UtteranceEvent, 
    incomingEnvelope: Envelope
  ): Promise<any> {
    try {
```

First, let's try to extract the dialog event from the utterance:

```typescript
      const dialogEvent = event.parameters?.dialogEvent as { features?: any };
      if (!dialogEvent || typeof dialogEvent !== 'object' || !dialogEvent.features || typeof dialogEvent.features !== 'object') {
        return createTextUtterance({
          speakerUri: this.speakerUri,
          text: "🦜 *chirp* I didn't receive a valid dialog event!",
          to: { speakerUri: incomingEnvelope.sender.speakerUri }
        });
      }
```

**What we're doing:**
-   Extracting the dialog event from the utterance parameters
-   Checking if it has the structure we expect
-   If not, sending a friendly error message

Now, as we know we are dealing with a valid dialog event, we can try to get the text from it:

```typescript
      const textFeature = dialogEvent.features.text;
      if (!textFeature || !textFeature.tokens || textFeature.tokens.length === 0) {
        // No text to parrot, send a default response
        return createTextUtterance({
          speakerUri: this.speakerUri,
          text: "🦜 *chirp* I can only repeat text messages!",
          to: { speakerUri: incomingEnvelope.sender.speakerUri }
        });
      }
```
We only handle text, so as you see also here, we would return early with an `createTextUtterance` and a generic message if the `textFeature` is not how we expect it.

But now everything should be valid, and we can go for the actual parroting:

```typescript
      // Combine all token values to get the full text
      const originalText = textFeature.tokens
        .map((token: any) => token.value)
        .join('');

      // Create parrot response with emoji prefix
      const parrotText = `🦜 ${originalText}`;
      
      return createTextUtterance({
        speakerUri: this.speakerUri,
        text: parrotText,
        to: { speakerUri: incomingEnvelope.sender.speakerUri },
        confidence: 1.0 // Parrot is very confident in repeating!
      });
```

**The parroting logic:**
-   Extract text from tokens by mapping over them and joining
-   Add the 🦜 emoji prefix
-   Create a text utterance response
-   Set confidence to 1.0 because 🦜 are confident!

Finally, we can add some error handling and close the method:

```typescript
    } catch (error) {
      console.error('Error in parrot utterance handling:', error);
      // Send error response
      return createTextUtterance({
        speakerUri: this.speakerUri,
        text: "🦜 *confused chirp* Something went wrong while trying to repeat that!",
        to: { speakerUri: incomingEnvelope.sender.speakerUri }
      });
    }
  }
```

The only thing that is left to do is close the class with a closing brace:

```typescript
}
```

### Step 1.5: Add the factory function

After the class, add this factory function with the default configuration:

```typescript
/**
 * Factory function to create a ParrotAgent with default configuration
 */
export function createParrotAgent(options: {
  speakerUri: string;
  serviceUrl: string;
  name?: string;
  organization?: string;
  description?: string;
}): ParrotAgent {
  const {
    speakerUri,
    serviceUrl,
    name = 'Parrot Agent',
    organization = 'OpenFloor Demo',
    description = 'A simple parrot agent that echoes back messages with a 🦜 emoji'
  } = options;

  const manifest: ManifestOptions = {
    identification: {
      speakerUri,
      serviceUrl,
      organization,
      conversationalName: name,
      synopsis: description
    },
    capabilities: [
      {
        keyphrases: ['echo', 'repeat', 'parrot', 'say'],
        descriptions: [
          'Echoes back any text message with a 🦜 emoji',
          'Repeats user input verbatim',
          'Simple text mirroring functionality'
        ]
      }
    ]
  };

  return new ParrotAgent(manifest);
}
```

**What this factory does:**
-   Takes configuration options
-   Provides some defaults
-   Creates a manifest that describes our agent's capabilities
-   Returns a new ParrotAgent instance

## Step 2: Building the Express Server

The agent itself is done, but how to talk to it? We need to build our express server for this, so start with creating a `src/server.ts` file.

### Step 2.1: Add imports

Add these imports at the top:

```typescript
import express, { Request, Response } from 'express';
import { createParrotAgent } from './parrot-agent';
import { 
  validateAndParsePayload
} from '@openfloor/protocol';
```

### Step 2.2: Create the Express app

```typescript
const app = express();
app.use(express.json());
```

### Step 2.3: Add CORS middleware

You might want to add a CORS configuration to allow access to your agent from different origins:

```typescript
// CORS middleware for http://127.0.0.1:4000
const allowedOrigin = 'http://127.0.0.1:4000';
app.use((req, res, next) => {
  if (req.headers.origin === allowedOrigin) {
    res.header('Access-Control-Allow-Origin', allowedOrigin);
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});
```

**Why this CORS setup?**
-   Only allows requests from the specific domain
-   Handles preflight `OPTIONS` requests
-   Restricts to `POST` methods and the `Content-Type` header

### Step 2.4: Create the agent instance

Now we need to create our parrot by using the factory function `createParrotAgent`. Important is that the `serviceUrl` matches your server endpoint; otherwise our agent will deny the request (remember the check we added in section 1.3).

```typescript
// Create the parrot agent instance
const parrotAgent = createParrotAgent({
  speakerUri: 'tag:openfloor-demo.com,2025:parrot-agent',
  serviceUrl: process.env.SERVICE_URL || 'http://localhost:8080/',
  name: 'Polly the Parrot',
  organization: 'OpenFloor Demo Corp',
  description: 'A friendly parrot that repeats everything you say!'
});
```

### Step 2.5: Build the main endpoint step by step

Now we have the agent and the Express app, but the most important part is still missing, and that's our endpoint:

```typescript
// Main Open Floor Protocol endpoint
app.post('/', async (req: Request, res: Response) => {
  try {
    console.log('Received request:', JSON.stringify(req.body, null, 2));
```

First, let's validate the incoming payload with the `validateAndParsePayload` function from the `@openfloor/protocol` package:

```typescript
    // Validate and parse the incoming payload
    const validationResult = validateAndParsePayload(JSON.stringify(req.body));
    
    if (!validationResult.valid) {
      console.error('Validation errors:', validationResult.errors);
      return res.status(400).json({
        error: 'Invalid OpenFloor payload',
        details: validationResult.errors
      });
    }
```

Now we know the payload is valid, and we can extract the envelope:

```typescript
    const payload = validationResult.payload!;
    const incomingEnvelope = payload.openFloor;

    console.log('Processing envelope from:', incomingEnvelope.sender.speakerUri);
```

Then let's process the envelope through our parrot agent:

```typescript
    // Process the envelope through the parrot agent
    const outgoingEnvelope = await parrotAgent.processEnvelope(incomingEnvelope);
```

After the processing, we can create and send the response:

```typescript
    // Create response payload
    const responsePayload = outgoingEnvelope.toPayload();
    const response = responsePayload.toObject();

    console.log('Sending response:', JSON.stringify(response, null, 2));

    res.json(response);
```

Finally, we add the catch block and close the endpoint:

```typescript
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
```

### Step 2.6: Export the app

```typescript
export default app;
```

## Step 3: Creating the Entry Point

We end by creating a simple `src/index.ts` as our entry point:

```typescript
import app from './server';

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Parrot Agent server running on port ${PORT}`);
});
```

## Step 4: Final Setup

Add or overwrite these scripts in the existing `scripts` object in your `package.json`:

```json
{
  "scripts": {
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts",
    "build": "tsc"
  }
}
```

## Test Your Implementation

Run this to test:

```bash
npm run dev
```

Send your manifest or utterance requests to `http://localhost:8080/` to see if it's working! You can also download the simple single HTML file manifest and utterance chat [azettl/openfloor-js-chat](https://github.com/azettl/openfloor-js-chat) to test your agent locally.

If you found this guide useful follow me for more and let me know what you build with it in the comments!
