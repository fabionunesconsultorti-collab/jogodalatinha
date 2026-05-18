import os
import sys
import zipfile
import threading
from tkinter import filedialog, messagebox
import customtkinter as ctk
from PIL import Image, ImageDraw

def generate_projective_plane(n):
    """
    Gera o Plano Projetivo Finito de ordem n.
    Retorna uma lista de cartas, onde cada carta é uma lista de IDs de símbolos.
    """
    cards_list = []
    
    # Matriz nxn
    for i in range(n):
        for j in range(n):
            card = []
            for x in range(n):
                card.append(x * n + ((i * x + j) % n))
            card.append(n * n + i)
            cards_list.append(card)
            
    # Linhas e colunas infinitas
    for i in range(n):
        card = []
        for j in range(n):
            card.append(j * n + i)
        card.append(n * n + n)
        cards_list.append(card)
        
    # Ponto no infinito
    infinite_card = []
    for i in range(n + 1):
        infinite_card.append(n * n + i)
    cards_list.append(infinite_card)
    
    return cards_list

def solve_size_assignment(card_matrix, k, total_required):
    """
    Atribui um tamanho fixo (0 a k-1) para cada símbolo em cada carta,
    garantindo que não haja repetições de tamanho na mesma carta
    ou para o mesmo símbolo em cartas diferentes (Coloração de Arestas em Grafo Bipartido).
    """
    num_cards = len(card_matrix)
    num_symbols = total_required
    
    size_assignments = [{} for _ in range(num_cards)]
    card_used_colors = [[-1] * k for _ in range(num_cards)]
    symbol_used_colors = [[-1] * k for _ in range(num_symbols)]

    def assign(c_idx, s_idx, color):
        size_assignments[c_idx][s_idx] = color
        card_used_colors[c_idx][color] = s_idx
        symbol_used_colors[s_idx][color] = c_idx

    def path_flip(c_idx, s_idx, a, b):
        curr_c = c_idx
        curr_s = s_idx
        path = []
        next_card = symbol_used_colors[curr_s][a]
        while next_card != -1:
            path.append({'s': curr_s, 'c': next_card, 'oldColor': a, 'newColor': b})
            next_sym = card_used_colors[next_card][b]
            if next_sym == -1:
                break
            curr_s = next_sym
            next_card = symbol_used_colors[curr_s][a]
        
        for node in path:
            card_used_colors[node['c']][node['oldColor']] = -1
            symbol_used_colors[node['s']][node['oldColor']] = -1
            card_used_colors[node['c']][node['newColor']] = node['s']
            symbol_used_colors[node['s']][node['newColor']] = node['c']
            size_assignments[node['c']][node['s']] = node['newColor']
        assign(c_idx, s_idx, a)

    for card_idx, card_symbols in enumerate(card_matrix):
        for symbol_idx in card_symbols:
            a, b = -1, -1
            for c in range(k):
                if a == -1 and card_used_colors[card_idx][c] == -1:
                    a = c
                if b == -1 and symbol_used_colors[symbol_idx][c] == -1:
                    b = c
            
            if a == b:
                assign(card_idx, symbol_idx, a)
            else:
                path_flip(card_idx, symbol_idx, a, b)
                
    return size_assignments

layouts = {
    6: [
        {'x': 0.5, 'y': 0.5}, {'x': 0.5, 'y': 0.18}, {'x': 0.82, 'y': 0.42},
        {'x': 0.70, 'y': 0.78}, {'x': 0.30, 'y': 0.78}, {'x': 0.18, 'y': 0.42},
    ],
    8: [
        {'x': 0.42, 'y': 0.42}, {'x': 0.65, 'y': 0.58}, {'x': 0.50, 'y': 0.16},
        {'x': 0.84, 'y': 0.40}, {'x': 0.75, 'y': 0.80}, {'x': 0.40, 'y': 0.84},
        {'x': 0.16, 'y': 0.60}, {'x': 0.18, 'y': 0.28},
    ]
}

def get_scale(size_index, current_k):
    scales = {
        6: [0.15, 0.18, 0.22, 0.25, 0.28, 0.35],
        8: [0.12, 0.14, 0.16, 0.18, 0.20, 0.22, 0.25, 0.30]
    }
    return scales[current_k][size_index]

def render_card(symbols_info, k, index, images_map):
    """
    Renderiza uma carta como imagem.
    Retorna objeto Image (Pillow).
    """
    size = 1200
    card_img = Image.new('RGBA', (size, size), (255, 255, 255, 0))
    draw = ImageDraw.Draw(card_img)
    
    # Desenhar círculo de fundo branco com borda
    draw.ellipse((10, 10, size - 10, size - 10), fill='#ffffff', outline='#e2e8f0', width=4)
    
    current_layout = layouts[k]
    # Ordenar por tamanho do maior para o menor (se sobrepuser, menor fica na frente)
    sorted_symbols = sorted(symbols_info, key=lambda x: x['sizeIndex'], reverse=True)
    
    for s, symbol in enumerate(sorted_symbols):
        img_path = images_map[symbol['symbol_id']]
        size_index = symbol['sizeIndex']
        
        try:
            sym_img = Image.open(img_path).convert("RGBA")
        except Exception as e:
            print(f"Aviso: Não foi possível carregar a imagem '{img_path}'. Ignorando... ({e})")
            continue
            
        slot = current_layout[s]
        center_x = slot['x'] * size
        center_y = slot['y'] * size
        
        # Rotacao em graus (negativo para simular rotação no sentido horário do JS Canvas)
        angle = (index * 45 + s * 30)
        
        scale_factor = get_scale(size_index, k)
        draw_size = size * scale_factor
        
        aspect = sym_img.width / sym_img.height
        if aspect > 1:
            dw = draw_size
            dh = draw_size / aspect
        else:
            dw = draw_size * aspect
            dh = draw_size
            
        dw, dh = int(dw), int(dh)
        
        # Redimensionar
        sym_img = sym_img.resize((dw, dh), Image.Resampling.LANCZOS)
        
        # Rotacionar mantendo expansão para não cortar os cantos
        sym_img = sym_img.rotate(-angle, expand=True, resample=Image.Resampling.BICUBIC)
        
        # Calcular posição para centralizar
        paste_x = int(center_x - sym_img.width / 2)
        paste_y = int(center_y - sym_img.height / 2)
        
        # Colar usando alpha_composite para respeitar transparência do PNG
        card_img.alpha_composite(sym_img, (paste_x, paste_y))
        
    return card_img

class App(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("Gerador de Cartas de Agilidade")
        self.geometry("600x480")
        
        # Configurar grade principal
        self.grid_columnconfigure(0, weight=1)
        
        # Estados
        self.folder_path = ctk.StringVar()
        self.image_files = []
        self.order_var = ctk.IntVar(value=5)
        
        self.create_widgets()
        
    def create_widgets(self):
        # Título
        self.title_label = ctk.CTkLabel(self, text="Gerador de Cartas de Agilidade", font=ctk.CTkFont(size=22, weight="bold"))
        self.title_label.grid(row=0, column=0, padx=20, pady=(25, 15))
        
        # Frame de Seleção de Pasta
        self.folder_frame = ctk.CTkFrame(self)
        self.folder_frame.grid(row=1, column=0, padx=20, pady=10, sticky="ew")
        self.folder_frame.grid_columnconfigure(1, weight=1)
        
        self.btn_select_folder = ctk.CTkButton(self.folder_frame, text="Selecionar Pasta", command=self.select_folder)
        self.btn_select_folder.grid(row=0, column=0, padx=10, pady=10)
        
        self.lbl_folder_path = ctk.CTkLabel(self.folder_frame, textvariable=self.folder_path, text_color="gray", anchor="w")
        self.lbl_folder_path.grid(row=0, column=1, padx=10, pady=10, sticky="ew")
        
        # Label de Informação de Imagens
        self.lbl_info = ctk.CTkLabel(self, text="Selecione uma pasta com imagens (.png, .jpg, .webp).")
        self.lbl_info.grid(row=2, column=0, padx=20, pady=5)
        
        # Frame de Opções de Baralho
        self.options_frame = ctk.CTkFrame(self)
        self.options_frame.grid(row=3, column=0, padx=20, pady=10, sticky="ew")
        self.options_frame.grid_columnconfigure((0,1), weight=1)
        
        self.lbl_order = ctk.CTkLabel(self.options_frame, text="Tamanho do Baralho:", font=ctk.CTkFont(weight="bold"))
        self.lbl_order.grid(row=0, column=0, rowspan=2, padx=10, pady=10, sticky="e")
        
        self.radio_5 = ctk.CTkRadioButton(self.options_frame, text="31 Cartas (6 itens)", variable=self.order_var, value=5)
        self.radio_5.grid(row=0, column=1, padx=10, pady=10, sticky="w")
        
        self.radio_7 = ctk.CTkRadioButton(self.options_frame, text="57 Cartas (8 itens)", variable=self.order_var, value=7)
        self.radio_7.grid(row=1, column=1, padx=10, pady=10, sticky="w")
        
        # Botão Gerar
        self.btn_generate = ctk.CTkButton(self, text="Gerar Baralho", command=self.start_generation, height=45, font=ctk.CTkFont(size=15, weight="bold"))
        self.btn_generate.grid(row=4, column=0, padx=20, pady=20)
        
        # Frame de Progresso
        self.progress_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.progress_frame.grid(row=5, column=0, padx=20, pady=(0, 20), sticky="ew")
        self.progress_frame.grid_columnconfigure(0, weight=1)
        
        self.progress_bar = ctk.CTkProgressBar(self.progress_frame)
        self.progress_bar.grid(row=0, column=0, sticky="ew")
        self.progress_bar.set(0)
        
        self.lbl_status = ctk.CTkLabel(self.progress_frame, text="Aguardando...", text_color="gray")
        self.lbl_status.grid(row=1, column=0, pady=5)
        
    def select_folder(self):
        folder = filedialog.askdirectory()
        if folder:
            self.folder_path.set(folder)
            valid_extensions = ('.png', '.jpg', '.jpeg', '.webp')
            self.image_files = []
            for f in os.listdir(folder):
                if f.lower().endswith(valid_extensions):
                    self.image_files.append(os.path.join(folder, f))
            self.image_files.sort()
            
            count = len(self.image_files)
            if count >= 57:
                self.lbl_info.configure(text=f"Encontradas {count} imagens. Você pode gerar 31 ou 57 cartas.", text_color="#2ecc71")
                self.radio_5.configure(state="normal")
                self.radio_7.configure(state="normal")
            elif count >= 31:
                self.lbl_info.configure(text=f"Encontradas {count} imagens. Você só pode gerar 31 cartas.", text_color="#f39c12")
                self.order_var.set(5)
                self.radio_5.configure(state="normal")
                self.radio_7.configure(state="disabled")
            else:
                self.lbl_info.configure(text=f"Erro: Encontradas apenas {count} imagens. São necessárias no mínimo 31.", text_color="#e74c3c")
                self.radio_5.configure(state="disabled")
                self.radio_7.configure(state="disabled")

    def update_status(self, text, progress=None):
        self.after(0, self._update_status_ui, text, progress)

    def _update_status_ui(self, text, progress):
        self.lbl_status.configure(text=text)
        if progress is not None:
            self.progress_bar.set(progress)

    def _finish_generation(self, out_dir, zip_path):
        self.update_status(f"Concluído! Salvo em '{out_dir}' e '{zip_path}'", 1.0)
        self.btn_generate.configure(state="normal")
        self.btn_select_folder.configure(state="normal")
        messagebox.showinfo("Sucesso", f"Processo concluído com sucesso!\\n\\nImagens salvas na pasta:\\n{out_dir}\\n\\nArquivo ZIP gerado:\\n{zip_path}")

    def _error_generation(self, error_msg):
        self.update_status(f"Erro: {error_msg}", 0)
        self.btn_generate.configure(state="normal")
        self.btn_select_folder.configure(state="normal")
        messagebox.showerror("Erro", f"Ocorreu um erro durante a geração:\\n{error_msg}")

    def start_generation(self):
        if not self.folder_path.get():
            messagebox.showwarning("Aviso", "Selecione uma pasta com imagens primeiro.")
            return
            
        order = self.order_var.get()
        total_required = order * order + order + 1
        
        if len(self.image_files) < total_required:
            messagebox.showerror("Erro", f"São necessárias no mínimo {total_required} imagens.")
            return
            
        self.btn_generate.configure(state="disabled")
        self.btn_select_folder.configure(state="disabled")
        self.progress_bar.set(0)
        
        # Rodar a geração em uma thread secundária para não travar a UI
        thread = threading.Thread(target=self.generate_cards_thread, args=(order, total_required))
        thread.daemon = True
        thread.start()

    def generate_cards_thread(self, order, total_required):
        try:
            self.update_status("Calculando matriz e combinatória...", 0)
            
            k = order + 1
            images = self.image_files[:total_required]
            images_map = {i: img for i, img in enumerate(images)}
            
            matrix = generate_projective_plane(order)
            size_map = solve_size_assignment(matrix, k, total_required)
            
            cards = []
            for c_idx, card_symbols in enumerate(matrix):
                symbols_info = []
                for s_idx in card_symbols:
                    symbols_info.append({
                        'symbol_id': s_idx,
                        'sizeIndex': size_map[c_idx][s_idx]
                    })
                cards.append(symbols_info)
                
            out_dir = os.path.join(self.folder_path.get(), f"cartas_geradas_{k}_itens")
            os.makedirs(out_dir, exist_ok=True)
            
            zip_path = os.path.join(self.folder_path.get(), f"BARALHO_COMPLETO_{k}_ITENS.zip")
            
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                for idx, symbols_info in enumerate(cards):
                    card_number = idx + 1
                    self.update_status(f"Renderizando Carta {card_number}/{total_required}...", idx / total_required)
                    
                    card_img = render_card(symbols_info, k, card_number, images_map)
                    
                    filename = f"Carta_{str(card_number).zfill(2)}.png"
                    file_path = os.path.join(out_dir, filename)
                    
                    card_img.save(file_path, "PNG")
                    zipf.write(file_path, filename)
                    
            self.after(0, self._finish_generation, out_dir, zip_path)
            
        except Exception as e:
            self.after(0, self._error_generation, str(e))

if __name__ == "__main__":
    # Configurações do CustomTkinter
    ctk.set_appearance_mode("System")  
    ctk.set_default_color_theme("blue")  
    
    app = App()
    app.mainloop()
