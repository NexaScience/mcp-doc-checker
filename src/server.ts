import { MCP_PROTOCOL_VERSION, MCP_CAPABILITIES } from './core/constants';
import { logger } from './utils/logger';
import { MessageHandler } from './core/message-handler';
import { ChecklistService } from './services/checklist-service';
import { ToolHandler } from './handlers/tool-handler';
import { MCPServerInfo } from './types/mcp';

const serverConfig: MCPServerInfo = {
  name: 'mcp-doc-checker',
  version: '1.0.0',
  capabilities: MCP_CAPABILITIES,
  protocolVersion: MCP_PROTOCOL_VERSION
};

function initializeServer(): MessageHandler {
  const checklistService = new ChecklistService();
  const toolHandler = new ToolHandler(checklistService);

  const messageHandler = new MessageHandler(serverConfig, toolHandler);

  logger.info('MCP Server initialized', {
    server: serverConfig.name,
    version: serverConfig.version,
    protocol: serverConfig.protocolVersion
  });

  return messageHandler;
}

async function main(): Promise<void> {
  const messageHandler = initializeServer();

  process.stdin.setEncoding('utf8');
  let messageBuffer = '';

  process.stdin.on('data', async (chunk: string) => {
    messageBuffer += chunk;

    let messageEnd: number;
    while ((messageEnd = messageBuffer.indexOf('\n')) !== -1) {
      const rawMessage = messageBuffer.slice(0, messageEnd).trim();
      messageBuffer = messageBuffer.slice(messageEnd + 1);

      if (rawMessage) {
        try {
          const response = await messageHandler.handleMessage(rawMessage);
          if (response) {
            process.stdout.write(JSON.stringify(response) + '\n');
          }
        } catch (error) {
          logger.error('Message processing error', {
            message: rawMessage,
            error: (error as Error).message
          });
        }
      }
    }
  });

  process.stdin.on('end', () => {
    logger.info('Client disconnected');
    process.exit(0);
  });

  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught exception', { error: error.message, stack: error.stack });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason: any, _promise: Promise<any>) => {
    logger.error('Unhandled promise rejection', { reason });
    process.exit(1);
  });

  logger.info('MCP Server started and listening on stdio');
}

if (require.main === module) {
  main().catch((error: Error) => {
    logger.error('Server startup failed', { error: error.message });
    process.exit(1);
  });
}

export { initializeServer, serverConfig };
