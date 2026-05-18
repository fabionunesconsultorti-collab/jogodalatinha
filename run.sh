#!/bin/bash

# Define o diretório atual como base
cd "$(dirname "$0")"

# Verifica se o ambiente virtual existe, se não, cria
if [ ! -d ".venv" ]; then
    echo "Criando ambiente virtual (.venv)..."
    python3 -m venv .venv
    echo "Instalando dependências..."
    ./.venv/bin/pip install -r requirements.txt
fi

# Executa a aplicação
echo "Iniciando o Gerador de Cartas de Agilidade..."
./.venv/bin/python gerador_cartas.py
