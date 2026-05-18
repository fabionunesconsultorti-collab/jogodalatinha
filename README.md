# Jogo da Latinha

Uma aplicação para gerar cartas de forma automatizada e visual. Este projeto utiliza Python com a biblioteca [Pillow](https://python-pillow.org/) para processamento de imagens e [CustomTkinter](https://customtkinter.tomschimansky.com/) para a interface gráfica moderna.

## Instalação

Você pode baixar os instaladores para Windows (`.exe`) ou Linux (`.deb`) na aba [Releases](https://github.com/fabionunesconsultorti-collab/jogodalatinha/releases) do GitHub.

### Executando a partir do código-fonte (Desenvolvedores)

1. Clone o repositório:
```bash
git clone https://github.com/fabionunesconsultorti-collab/jogodalatinha.git
cd jogodalatinha
```

2. Crie um ambiente virtual (opcional, mas recomendado):
```bash
python3 -m venv .venv
source .venv/bin/activate
```

3. Instale as dependências:
```bash
pip install -r requirements.txt
```

4. Execute o programa:
```bash
python gerador_cartas.py
```
(Ou utilize o script `./run.sh` no Linux).

## Como funciona

O projeto gera cartas customizadas que podem ser usadas para jogos educacionais ou entretenimento. Todo o processamento de imagem e interface são construídos localmente usando as bibliotecas mencionadas acima.
