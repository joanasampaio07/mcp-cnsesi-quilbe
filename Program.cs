using System;
using System.Threading.Tasks;
using Sesi.McpSesiServer.Tools;

namespace Sesi.McpSesiServer;

class Program
{
    static async Task Main(string[] args)
    {
        Console.WriteLine("🚀 MCP CN SESI Server iniciando...");
        
        // Simulação do loop do servidor MCP via stdio
        // Em uma implementação real, usaríamos o SDK MCP para gerenciar o protocolo.
        
        var tools = new SesiTools();
        
        Console.WriteLine("✅ Servidor pronto e escutando ferramentas via stdio.");
        
        // Mantém o processo vivo (simulando o comportamento de stdio)
        while (true)
        {
            var line = await Console.In.ReadLineAsync();
            if (line == "exit") break;
            
            // Aqui o SDK processaria as mensagens do MCP Protocol
            if (!string.IsNullOrEmpty(line))
            {
                // Placeholder para resposta do protocolo
                Console.WriteLine($"[DEBUG] Recebido: {line}");
            }
        }
    }
}
