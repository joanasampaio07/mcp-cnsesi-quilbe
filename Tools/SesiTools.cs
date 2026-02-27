using Microsoft.Extensions.AI;
using System.Data.SqlClient;
using System.Net.Http.Json;
using System.Text.Json;
using System.IO;
using System.Text;

namespace Sesi.McpSesiServer.Tools;

public class SesiTools
{
    private class AIConfig 
    {
        public string Type { get; set; } = "Ollama";
        public string Endpoint { get; set; } = "";
        public string ApiKey { get; set; } = "";
        public string ModelName { get; set; } = "quilbe";
    }

    private class SystemInfo 
    {
        public string Id { get; set; } = "";
        public string Host { get; set; } = "";
        public string Database { get; set; } = "";
        public string User { get; set; } = "";
        public string Password { get; set; } = "";
    }

    private AIConfig GetAIConfig() 
    {
        try {
            var json = File.ReadAllText("Config/SystemRegistry.json");
            var data = JsonSerializer.Deserialize<JsonElement>(json);
            return JsonSerializer.Deserialize<AIConfig>(data.GetProperty("AI_Config").GetRawText()) ?? new();
        } catch { return new AIConfig(); }
    }

    private List<SystemInfo> GetSystems() 
    {
        try {
            var json = File.ReadAllText("Config/SystemRegistry.json");
            var data = JsonSerializer.Deserialize<JsonElement>(json);
            return JsonSerializer.Deserialize<List<SystemInfo>>(data.GetProperty("Systems").GetRawText()) ?? new();
        } catch { return new(); }
    }

    private string GetConnectionString(string systemId) 
    {
        var sys = GetSystems().FirstOrDefault(s => s.Id == systemId);
        if (sys == null) return null;

        return $"Server={sys.Host};Database={sys.Database};User Id={sys.User};Password={sys.Password};";
    }

    public string QuerySystemData(string systemId, string sqlQuery, string adminToken)
    {
        if (adminToken != "admin-joana-secret-123") return "❌ Acesso negado.";

        string connStr = GetConnectionString(systemId);
        if (string.IsNullOrEmpty(connStr)) return $"❌ Sistema '{systemId}' não encontrado.";
        
        return $"✅ [{systemId}] Conectado e simulando consulta no banco {systemId}...";
    }

    public async Task<string> AskQuilbe(string question, string adminToken)
    {
        if (adminToken != "admin-joana-secret-123") return "❌ Acesso negado.";
        
        var config = GetAIConfig();
        
        try 
        {
            using var client = new HttpClient();
            if (!string.IsNullOrEmpty(config.ApiKey))
            {
                client.DefaultRequestHeaders.Add("Authorization", $"Bearer {config.ApiKey}");
            }

            // Payloads dinâmicos baseados no tipo de configuração
            object payload;
            if (config.Type == "Ollama") {
                payload = new {
                    model = config.ModelName,
                    prompt = $"Você é o ambiente MCP CN SESI. Joana Sampaio pergunta: {question}",
                    stream = false
                };
            } else {
                // Formato genérico para APIs customizadas do Quilbe
                payload = new {
                    model = config.ModelName,
                    messages = new[] { new { role = "user", content = question } }
                };
            }
            
            var response = await client.PostAsJsonAsync(config.Endpoint, payload);
            var result = await response.Content.ReadFromJsonAsync<JsonDocument>();
            
            // Tenta extrair a resposta de diferentes formatos comuns de API
            if (result != null && result.RootElement.TryGetProperty("response", out var resp)) return resp.GetString() ?? "Erro";
            if (result != null && result.RootElement.TryGetProperty("choices", out var choices)) return choices[0].GetProperty("message").GetProperty("content").GetString() ?? "Erro";

            return "⚠️ Resposta recebida da API Customizada, mas o formato é desconhecido.";
        }
        catch (Exception ex)
        {
            return $"❌ Erro ao conectar na ferramenta Quilbe em {config.Endpoint}: {ex.Message}";
        }
    }
}
