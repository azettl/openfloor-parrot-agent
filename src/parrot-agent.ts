import { 
  BotAgent, 
  ManifestOptions, 
  UtteranceEvent, 
  Envelope,
  createTextUtterance,
  isUtteranceEvent
} from '@openfloor/protocol';

/**
 * ParrotAgent - A simple agent that echoes back whatever it receives
 * Extends BotAgent to provide parrot functionality
 */
export class ParrotAgent extends BotAgent {
  constructor(manifest: ManifestOptions) {
    super(manifest);
  }

  /**
   * Override the processEnvelope method to handle parrot functionality
   */
  async processEnvelope(inEnvelope: Envelope): Promise<Envelope> {
    // Create response envelope
    const outEnvelope = new Envelope({
      schema: { version: inEnvelope.schema.version },
      conversation: { id: inEnvelope.conversation.id },
      sender: {
        speakerUri: this.speakerUri,
        serviceUrl: this.serviceUrl
      },
      events: []
    });

    // Process each event
    for (const event of inEnvelope.events) {
      // Check if this event is addressed to us
      const addressedToMe = !event.to || 
        event.to.speakerUri === this.speakerUri || 
        event.to.serviceUrl === this.serviceUrl;

      if (addressedToMe && isUtteranceEvent(event)) {
        await this._handleParrotUtterance(event, inEnvelope, outEnvelope);
      }
    }

    return outEnvelope;
  }

  /**
   * Handle utterance events by echoing them back
   */
  private async _handleParrotUtterance(
    event: UtteranceEvent, 
    inEnvelope: Envelope, 
    outEnvelope: Envelope
  ): Promise<void> {
    try {
      // Extract text from the incoming utterance
      const dialogEvent = event.dialogEvent;
      const textFeature = dialogEvent.features?.get('text');
      
      if (!textFeature || !textFeature.tokens || textFeature.tokens.length === 0) {
        // No text to parrot, send a default response
        const responseEvent = createTextUtterance({
          speakerUri: this.speakerUri,
          text: "🦜 *chirp* I can only repeat text messages!",
          to: { speakerUri: inEnvelope.sender.speakerUri }
        });
        
        (outEnvelope as any)._events = [...outEnvelope.events, responseEvent];
        return;
      }

      // Combine all token values to get the full text
      const originalText = textFeature.tokens
        .map((token: any) => token.value)
        .join('');

      // Create parrot response with emoji prefix
      const parrotText = `🦜 ${originalText}`;
      
      const responseEvent = createTextUtterance({
        speakerUri: this.speakerUri,
        text: parrotText,
        to: { speakerUri: inEnvelope.sender.speakerUri },
        confidence: 1.0 // Parrot is very confident in repeating!
      });

      // Add to output envelope
      (outEnvelope as any)._events = [...outEnvelope.events, responseEvent];
      
    } catch (error) {
      console.error('Error in parrot utterance handling:', error);
      
      // Send error response
      const errorResponse = createTextUtterance({
        speakerUri: this.speakerUri,
        text: "🦜 *confused chirp* Something went wrong while trying to repeat that!",
        to: { speakerUri: inEnvelope.sender.speakerUri }
      });
      
      (outEnvelope as any)._events = [...outEnvelope.events, errorResponse];
    }
  }
}

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
    description = 'A simple parrot agent that echoes back messages with a parrot emoji'
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
          'Echoes back any text message with a parrot emoji',
          'Repeats user input verbatim',
          'Simple text mirroring functionality'
        ]
      }
    ]
  };

  return new ParrotAgent(manifest);
}
