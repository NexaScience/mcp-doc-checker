import { JSON_RPC_ERRORS } from './constants';
import { MCPError } from '../utils/validator';
import { JsonRpcRequest, JsonRpcResponse, MCPServerInfo } from '../types/mcp';
import { ToolHandler } from '../handlers/tool-handler';

export function createMCPResponse(id: string | number | null, result?: any, error?: Error | MCPError): JsonRpcResponse {
  const response: JsonRpcResponse = { jsonrpc: '2.0', id };

  if (!error) {
    response.result = result;
    return response;
  }

  if (error instanceof MCPError) {
    response.error = error.toJSON();
    return response;
  }

  response.error = {
    code: JSON_RPC_ERRORS.INTERNAL_ERROR.code,
    message: JSON_RPC_ERRORS.INTERNAL_ERROR.message,
    data: error.message
  };

  return response;
}

export class MessageHandler {
  private serverInfo: MCPServerInfo;
  private toolHandler: ToolHandler;

  constructor(serverInfo: MCPServerInfo, toolHandler: ToolHandler) {
    this.serverInfo = serverInfo;
    this.toolHandler = toolHandler;
  }

  async handleMessage(message: string): Promise<JsonRpcResponse | null> {
    try {
      const request: JsonRpcRequest = JSON.parse(message);
      let response: JsonRpcResponse;

      switch (request.method) {
        case 'initialize':
          response = createMCPResponse(request.id ?? null, {
            protocolVersion: this.serverInfo.protocolVersion,
            capabilities: this.serverInfo.capabilities,
            serverInfo: {
              name: this.serverInfo.name,
              version: this.serverInfo.version
            }
          });
          break;

        case 'notifications/initialized':
          return null;

        case 'tools/list':
          response = createMCPResponse(request.id ?? null, {
            tools: ToolHandler.getToolDefinitions()
          });
          break;

        case 'resources/list':
          // Resources not implemented; return empty list for protocol compliance
          response = createMCPResponse(request.id ?? null, { resources: [] });
          break;

        case 'resources/read':
          // Resources not implemented
          response = createMCPResponse(
            request.id ?? null,
            undefined,
            new MCPError({
              code: -32006,
              message: 'Request parameters failed validation',
              data: 'Resources are not supported by this server'
            })
          );
          break;

        case 'tools/call': {
          const toolResult = await this.toolHandler.executeTool(
            request.params?.name,
            request.params?.arguments
          );
          response = createMCPResponse(request.id ?? null, toolResult);
          break;
        }

        default:
          response = createMCPResponse(request.id ?? null, undefined, new MCPError({
            code: JSON_RPC_ERRORS.METHOD_NOT_FOUND.code,
            message: JSON_RPC_ERRORS.METHOD_NOT_FOUND.message
          }));
      }

      return response;
    } catch (error) {
      let request: JsonRpcRequest | null = null;
      try {
        request = JSON.parse(message);
      } catch (_parseError) {
        // If we can't parse the request at all, send a parse error
      }

      const errorResponse = createMCPResponse(
        request?.id ?? null,
        undefined,
        error instanceof MCPError ? error : new MCPError({
          code: JSON_RPC_ERRORS.PARSE_ERROR.code,
          message: JSON_RPC_ERRORS.PARSE_ERROR.message,
          data: (error as Error).message
        })
      );

      return errorResponse;
    }
  }
}
