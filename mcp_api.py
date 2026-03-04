"""
MCP CN SESI — Backend API para Integração SQL Server
CAIO: Joana Paula Cardoso Sampaio | Brasília/DF

Instalar dependências no servidor Ubuntu:
    sudo apt-get install -y python3-pip freetds-dev freetds-bin
    pip3 install flask flask-cors pymssql

Iniciar servidor:
    python3 /home/vboxuser/mcp_api.py &

Ou como serviço systemd (recomendado para produção):
    sudo nano /etc/systemd/system/mcp-api.service
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import pymssql
import datetime
import json

app = Flask(__name__)
CORS(app)

# Bloqueio de palavras-chave destrutivas (camada extra de segurança)
BLOCKED_SQL_KEYWORDS = [
    'DROP', 'DELETE', 'TRUNCATE', 'INSERT', 'UPDATE',
    'ALTER', 'CREATE', 'EXEC', 'EXECUTE', 'XP_', 'SP_'
]

def is_safe_query(query: str) -> bool:
    """Permite apenas SELECT. Bloqueia qualquer comando destrutivo."""
    q = query.strip().upper()
    if not q.startswith('SELECT'):
        return False
    for keyword in BLOCKED_SQL_KEYWORDS:
        if f' {keyword} ' in f' {q} ' or q.startswith(keyword):
            if keyword != 'SELECT':
                return False
    return True


@app.route('/api/health', methods=['GET'])
def health():
    """Endpoint de verificação de saúde do backend."""
    return jsonify({
        'status': 'online',
        'service': 'MCP CN SESI — SQL Backend',
        'timestamp': datetime.datetime.now().isoformat()
    })


@app.route('/api/test-connection', methods=['POST'])
def test_connection():
    """
    Testa a conexão com um SQL Server.
    Body: { host, database, user, password }
    """
    data = request.json or {}
    host     = data.get('host', '')
    database = data.get('database', '')
    user     = data.get('user', '')
    password = data.get('password', '')

    if not all([host, database, user, password]):
        return jsonify({'success': False, 'message': 'Todos os campos são obrigatórios (host, database, user, password).'}), 400

    try:
        conn = pymssql.connect(server=host, user=user, password=password,
                               database=database, timeout=8)
        cursor = conn.cursor()
        cursor.execute("SELECT @@VERSION, @@SERVERNAME, DB_NAME()")
        row = cursor.fetchone()
        sql_version = row[0].split('\n')[0] if row else 'N/A'
        server_name = row[1] if row else host
        db_name     = row[2] if row else database

        # Contar tabelas disponíveis
        cursor.execute("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE'")
        table_count = cursor.fetchone()[0]
        conn.close()

        return jsonify({
            'success': True,
            'message': f'Conexão estabelecida com sucesso! {table_count} tabela(s) encontrada(s).',
            'details': {
                'server': server_name,
                'database': db_name,
                'version': sql_version,
                'tables': table_count
            }
        })

    except pymssql.OperationalError as e:
        return jsonify({'success': False, 'message': f'Erro de conexão: {str(e)}'})
    except pymssql.InterfaceError as e:
        return jsonify({'success': False, 'message': f'Erro de interface: {str(e)}'})
    except Exception as e:
        return jsonify({'success': False, 'message': f'Erro inesperado: {str(e)}'})


@app.route('/api/query', methods=['POST'])
def execute_query():
    """
    Executa uma query SELECT segura no SQL Server.
    Body: { host, database, user, password, query }
    Retorna no máximo 200 linhas.
    """
    data = request.json or {}
    host     = data.get('host', '')
    database = data.get('database', '')
    user     = data.get('user', '')
    password = data.get('password', '')
    query    = data.get('query', '')

    if not all([host, database, user, password, query]):
        return jsonify({'success': False, 'message': 'Campos incompletos.'}), 400

    if not is_safe_query(query):
        return jsonify({
            'success': False,
            'message': '⛔ Query bloqueada pela política de segurança MCP. Apenas consultas SELECT são permitidas.'
        }), 403

    try:
        conn = pymssql.connect(server=host, user=user, password=password,
                               database=database, timeout=15)
        cursor = conn.cursor(as_dict=True)
        cursor.execute(query)
        rows = cursor.fetchmany(200)
        conn.close()

        # Serializar datetime para string
        serialized = []
        for row in rows:
            serialized.append({
                k: (v.isoformat() if hasattr(v, 'isoformat') else v)
                for k, v in row.items()
            })

        return jsonify({
            'success': True,
            'count': len(serialized),
            'data': serialized
        })

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})


@app.route('/api/tables', methods=['POST'])
def list_tables():
    """
    Lista as tabelas disponíveis no banco de dados.
    Body: { host, database, user, password }
    """
    data = request.json or {}
    host     = data.get('host', '')
    database = data.get('database', '')
    user     = data.get('user', '')
    password = data.get('password', '')

    try:
        conn = pymssql.connect(server=host, user=user, password=password,
                               database=database, timeout=8)
        cursor = conn.cursor(as_dict=True)
        cursor.execute("""
            SELECT TABLE_NAME, TABLE_TYPE
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_NAME
        """)
        tables = cursor.fetchall()
        conn.close()
        return jsonify({'success': True, 'tables': [t['TABLE_NAME'] for t in tables]})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})


if __name__ == '__main__':
    print("🚀 MCP CN SESI - Backend SQL API iniciado em http://127.0.0.1:5000")
    app.run(host='127.0.0.1', port=5000, debug=False)
