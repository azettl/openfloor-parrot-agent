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
    const responseEvents: any[] = [];

    for (const event of inEnvelope.events) {
      // Check if this event is addressed to us
      const addressedToMe = !event.to || 
        event.to.speakerUri === this.speakerUri || 
        event.to.serviceUrl === this.serviceUrl;

      if (addressedToMe && isUtteranceEvent(event)) {
        const responseEvent = await this._handleParrotUtterance(event, inEnvelope);
        if (responseEvent) responseEvents.push(responseEvent);
      } else if (addressedToMe && event.eventType === 'getManifests') {
        // Respond to getManifests with publishManifests event
        responseEvents.push({
          eventType: 'publishManifests',
          to: { speakerUri: inEnvelope.sender.speakerUri },
          parameters: {
            servicingManifests: [this.manifest.toObject()]
          }
        });
      }
    }

    // Create response envelope with all response events
    return new Envelope({
      schema: { version: inEnvelope.schema.version },
      conversation: { id: inEnvelope.conversation.id },
      sender: {
        speakerUri: this.speakerUri,
        serviceUrl: this.serviceUrl
      },
      events: responseEvents
    });
  }

  /**
   * Handle utterance events by echoing them back
   */
  private async _handleParrotUtterance(
    event: UtteranceEvent, 
    inEnvelope: Envelope
  ): Promise<any> {
    try {
      // Extract text from the incoming utterance
      const dialogEvent = event.dialogEvent;
      const textFeature = dialogEvent.features?.get('text');
      
      if (!textFeature || !textFeature.tokens || textFeature.tokens.length === 0) {
        // No text to parrot, send a default response
        return createTextUtterance({
          speakerUri: this.speakerUri,
          text: "🦜 *chirp* I can only repeat text messages!",
          to: { speakerUri: inEnvelope.sender.speakerUri }
        });
      }

      // Combine all token values to get the full text
      const originalText = textFeature.tokens
        .map((token: any) => token.value)
        .join('');

      // Create parrot response with emoji prefix
      const parrotText = `🦜 ${originalText}`;
      
      return createTextUtterance({
        speakerUri: this.speakerUri,
        text: parrotText,
        to: { speakerUri: inEnvelope.sender.speakerUri },
        confidence: 1.0 // Parrot is very confident in repeating!
      });
    } catch (error) {
      console.error('Error in parrot utterance handling:', error);
      // Send error response
      return createTextUtterance({
        speakerUri: this.speakerUri,
        text: "🦜 *confused chirp* Something went wrong while trying to repeat that!",
        to: { speakerUri: inEnvelope.sender.speakerUri }
      });
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
