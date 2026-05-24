export type JsonRpcRequest = {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: any;
};

export type JsonRpcResponse = {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: any;
  error?: JsonRpcError;
};

export type JsonRpcError = {
  code: number;
  message: string;
  data?: any;
};

export type MCPServerInfo = {
  name: string;
  version: string;
  capabilities: MCPCapabilities;
  protocolVersion: string;
};

export type MCPCapabilities = {
  tools?: {
    listChanged?: boolean;
  };
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  logging?: Record<string, any>;
};

export type MCPTool = {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
};

export type ToolInputSchema = {
  type: string;
  properties: Record<string, any>;
  required?: string[];
  additionalProperties?: boolean;
};

export type ToolResult = {
  content: Array<{
    type: string;
    text: string;
  }>;
  isError?: boolean;
};
