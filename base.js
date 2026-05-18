import React, { useState, useEffect, useRef } from 'react';
import { Upload, Download, Settings, RefreshCw, Layers, Image as ImageIcon, Trash2, CheckCircle, Info, ShieldCheck, FileArchive } from 'lucide-react';

const App = () => {
    const [order, setOrder] = useState(7); // n=7 (8 símbolos) ou n=5 (6 símbolos)
    const [images, setImages] = useState([]);
    const [cards, setCards] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isZipping, setIsZipping] = useState(false);
    const [zipProgress, setZipProgress] = useState(0);

    const n = order;
    const k = n + 1; // Itens por carta
    const totalRequired = n * n + n + 1;

    useEffect(() => {
        const script = document.createElement('script');
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
        script.async = true;
        document.body.appendChild(script);
        return () => { document.body.removeChild(script); };
    }, []);

    const generateProjectivePlane = () => {
        const cardsList = [];
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                const card = [];
                for (let x = 0; x < n; x++) card.push(x * n + ((i * x + j) % n));
                card.push(n * n + i);
                cardsList.push(card);
            }
        }
        for (let i = 0; i < n; i++) {
            const card = [];
            for (let j = 0; j < n; j++) card.push(j * n + i);
            card.push(n * n + n);
            cardsList.push(card);
        }
        const infiniteCard = [];
        for (let i = 0; i <= n; i++) infiniteCard.push(n * n + i);
        cardsList.push(infiniteCard);
        return cardsList;
    };

    const solveSizeAssignment = (cardMatrix) => {
        const numCards = cardMatrix.length;
        const numSymbols = totalRequired;
        const sizeAssignments = Array.from({ length: numCards }, () => ({}));
        const cardUsedColors = Array.from({ length: numCards }, () => new Array(k).fill(-1));
        const symbolUsedColors = Array.from({ length: numSymbols }, () => new Array(k).fill(-1));

        cardMatrix.forEach((cardSymbols, cardIdx) => {
            cardSymbols.forEach(symbolIdx => {
                let a = -1, b = -1;
                for (let c = 0; c < k; c++) {
                    if (a === -1 && cardUsedColors[cardIdx][c] === -1) a = c;
                    if (b === -1 && symbolUsedColors[symbolIdx][c] === -1) b = c;
                }

                if (a === b) {
                    assign(cardIdx, symbolIdx, a);
                } else {
                    pathFlip(cardIdx, symbolIdx, a, b);
                }
            });
        });

        function assign(cIdx, sIdx, color) {
            sizeAssignments[cIdx][sIdx] = color;
            cardUsedColors[cIdx][color] = sIdx;
            symbolUsedColors[sIdx][color] = cIdx;
        }

        function pathFlip(cIdx, sIdx, a, b) {
            let currC = cIdx, currS = sIdx;
            const path = [];
            let nextCard = symbolUsedColors[currS][a];
            while (nextCard !== -1) {
                path.push({ s: currS, c: nextCard, oldColor: a, newColor: b });
                let nextSym = cardUsedColors[nextCard][b];
                if (nextSym === -1) break;
                currS = nextSym;
                nextCard = symbolUsedColors[currS][a];
            }
            path.forEach(node => {
                cardUsedColors[node.c][node.oldColor] = -1;
                symbolUsedColors[node.s][node.oldColor] = -1;
                cardUsedColors[node.c][node.newColor] = node.s;
                symbolUsedColors[node.s][node.newColor] = node.c;
                sizeAssignments[node.c][node.s] = node.newColor;
            });
            assign(cIdx, sIdx, a);
        }
        return sizeAssignments;
    };

    const layouts = {
        6: [
            { x: 0.5, y: 0.5 }, { x: 0.5, y: 0.18 }, { x: 0.82, y: 0.42 },
            { x: 0.70, y: 0.78 }, { x: 0.30, y: 0.78 }, { x: 0.18, y: 0.42 },
        ],
        8: [
            { x: 0.42, y: 0.42 }, { x: 0.65, y: 0.58 }, { x: 0.50, y: 0.16 },
            { x: 0.84, y: 0.40 }, { x: 0.75, y: 0.80 }, { x: 0.40, y: 0.84 },
            { x: 0.16, y: 0.60 }, { x: 0.18, y: 0.28 },
        ]
    };

    const getScale = (sizeIndex, currentK) => {
        const scales = {
            6: [0.15, 0.18, 0.22, 0.25, 0.28, 0.35],
            8: [0.12, 0.14, 0.16, 0.18, 0.20, 0.22, 0.25, 0.30]
        };
        return scales[currentK][sizeIndex];
    };

    const downloadAllAsZip = async () => {
        if (!window.JSZip) {
            alert("Biblioteca de compressão ainda carregando... tente em 2 segundos.");
            return;
        }
        setIsZipping(true);
        setZipProgress(0);
        const zip = new window.JSZip();
        const size = 1200;

        try {
            for (let i = 0; i < cards.length; i++) {
                const symbols = cards[i];
                const offCanvas = document.createElement('canvas');
                offCanvas.width = size;
                offCanvas.height = size;
                const ctx = offCanvas.getContext('2d');
                const center = size / 2;

                ctx.clearRect(0, 0, size, size);
                ctx.beginPath();
                ctx.arc(center, center, center - 10, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
                ctx.strokeStyle = '#e2e8f0';
                ctx.lineWidth = 4;
                ctx.stroke();

                const sortedSymbols = [...symbols].sort((a, b) => b.sizeIndex - a.sizeIndex);
                const currentLayout = layouts[k];

                for (let s = 0; s < sortedSymbols.length; s++) {
                    const { img, sizeIndex } = sortedSymbols[s];
                    if (!img) continue;

                    const imageObj = new Image();
                    imageObj.src = img.url;
                    await new Promise(r => imageObj.onload = r);

                    ctx.save();
                    const slot = currentLayout[s];
                    ctx.translate(slot.x * size, slot.y * size);
                    ctx.rotate(((i + 1) * 45 + s * 30) * Math.PI / 180);

                    const scaleFactor = getScale(sizeIndex, k);
                    const drawSize = size * scaleFactor;
                    const aspect = imageObj.width / imageObj.height;
                    let dw = aspect > 1 ? drawSize : drawSize * aspect;
                    let dh = aspect > 1 ? drawSize / aspect : drawSize;

                    ctx.drawImage(imageObj, -dw / 2, -dh / 2, dw, dh);
                    ctx.restore();
                }

                const dataUrl = offCanvas.toDataURL('image/png').split(',')[1];
                zip.file(`Carta_${(i + 1).toString().padStart(2, '0')}.png`, dataUrl, { base64: true });
                setZipProgress(Math.round(((i + 1) / cards.length) * 100));
            }

            const content = await zip.generateAsync({ type: 'blob' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = `BARALHO_COMPLETO_${k}_ITENS.zip`;
            link.click();
        } catch (err) {
            console.error(err);
        } finally {
            setIsZipping(false);
        }
    };

    const handleUpload = (e) => {
        const files = Array.from(e.target.files);
        const newImgs = files.map(file => ({
            id: Math.random().toString(36).substring(7),
            url: URL.createObjectURL(file),
            file
        }));
        setImages(prev => [...prev, ...newImgs].slice(0, totalRequired));
    };

    const processGeneration = () => {
        setIsGenerating(true);
        setTimeout(() => {
            const matrix = generateProjectivePlane();
            const sizeMap = solveSizeAssignment(matrix);
            const finalData = matrix.map((cardSymIds, cIdx) => {
                return cardSymIds.map(sId => ({
                    img: images[sId],
                    sizeIndex: sizeMap[cIdx][sId]
                }));
            });
            setCards(finalData);
            setIsGenerating(false);
        }, 600);
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans pb-20">
            <header className="bg-white border-b border-slate-200 p-6 mb-8 sticky top-0 z-30 shadow-sm">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
                            <ShieldCheck size={28} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-indigo-950 uppercase">Agilidade Pro v2</h1>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Anti-Sobreposição & Tamanhos Fixos</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 bg-slate-100 p-2 rounded-xl border border-slate-200">
                            <Settings size={18} className="text-slate-400" />
                            <select
                                value={order}
                                onChange={(e) => { setOrder(parseInt(e.target.value)); setCards([]); setImages([]); }}
                                className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 cursor-pointer"
                            >
                                <option value={5}>6 Itens (31 cartas)</option>
                                <option value={7}>8 Itens (57 cartas)</option>
                            </select>
                        </div>

                        <button
                            onClick={processGeneration}
                            disabled={images.length < totalRequired || isGenerating}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-2xl font-black text-sm transition-all shadow-xl shadow-indigo-100 flex items-center gap-2 uppercase"
                        >
                            {isGenerating ? <RefreshCw className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                            Gerar Baralho
                        </button>

                        {cards.length > 0 && (
                            <button
                                onClick={downloadAllAsZip}
                                disabled={isZipping}
                                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-2xl font-black text-sm transition-all shadow-xl shadow-emerald-100 flex items-center gap-2 uppercase"
                            >
                                {isZipping ? (
                                    <>
                                        <RefreshCw className="animate-spin" size={18} />
                                        {zipProgress}%
                                    </>
                                ) : (
                                    <>
                                        <FileArchive size={18} />
                                        Baixar .ZIP
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-end mb-6">
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Ativos Necessários</h2>
                            <span className="text-lg font-black text-indigo-600">{images.length} <span className="text-slate-300">/ {totalRequired}</span></span>
                        </div>

                        <label className={`w-full aspect-video border-4 border-dashed rounded-[24px] flex flex-col items-center justify-center gap-4 transition-all cursor-pointer mb-6 ${images.length >= totalRequired ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-50 border-slate-200 hover:bg-indigo-50 hover:border-indigo-300 text-slate-400'}`}>
                            <Upload size={32} />
                            <div className="text-center px-6">
                                <p className="text-xs font-black uppercase">Upload de Imagens</p>
                            </div>
                            <input type="file" multiple className="hidden" onChange={handleUpload} disabled={images.length >= totalRequired} />
                        </label>

                        <div className="grid grid-cols-4 gap-3 overflow-y-auto max-h-[400px] p-1 scrollbar-hide">
                            {images.map((img, idx) => (
                                <div key={img.id} className="relative aspect-square bg-slate-50 rounded-xl border border-slate-200 overflow-hidden group shadow-sm">
                                    <img src={img.url} className="w-full h-full object-contain p-2" />
                                    <button onClick={() => setImages(prev => prev.filter(i => i.id !== img.id))} className="absolute inset-0 bg-red-600/90 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-8">
                    {cards.length === 0 ? (
                        <div className="h-full min-h-[500px] border-4 border-dashed border-slate-200 rounded-[48px] flex flex-col items-center justify-center text-slate-300 bg-white/50">
                            <ImageIcon size={60} strokeWidth={1} className="mb-4 opacity-20" />
                            <p className="font-black text-sm uppercase tracking-widest">Aguardando geração...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {cards.map((symbols, idx) => (
                                <CardCanvas key={idx} index={idx + 1} symbols={symbols} k={k} layouts={layouts} getScale={getScale} />
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

const CardCanvas = ({ symbols, index, k, layouts, getScale }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const size = 1200;
        canvas.width = size;
        canvas.height = size;
        const center = size / 2;

        ctx.clearRect(0, 0, size, size);
        ctx.beginPath();
        ctx.arc(center, center, center - 10, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 4;
        ctx.stroke();

        const render = async () => {
            const currentLayout = layouts[k];
            const sortedSymbols = [...symbols].sort((a, b) => b.sizeIndex - a.sizeIndex);

            for (let i = 0; i < sortedSymbols.length; i++) {
                const { img, sizeIndex } = sortedSymbols[i];
                if (!img) continue;

                const imageObj = new Image();
                imageObj.src = img.url;
                await new Promise(r => imageObj.onload = r);

                ctx.save();
                const slot = currentLayout[i];
                ctx.translate(slot.x * size, slot.y * size);
                ctx.rotate((index * 45 + i * 30) * Math.PI / 180);

                const scaleFactor = getScale(sizeIndex, k);
                const drawSize = size * scaleFactor;
                const aspect = imageObj.width / imageObj.height;
                let dw = aspect > 1 ? drawSize : drawSize * aspect;
                let dh = aspect > 1 ? drawSize / aspect : drawSize;

                ctx.drawImage(imageObj, -dw / 2, -dh / 2, dw, dh);
                ctx.restore();
            }
        };

        render();
    }, [symbols, k, index, layouts, getScale]);

    const download = () => {
        const link = document.createElement('a');
        link.download = `AGILIDADE_CARTA_${index.toString().padStart(2, '0')}.png`;
        link.href = canvasRef.current.toDataURL('image/png', 1.0);
        link.click();
    };

    return (
        <div className="bg-white p-6 rounded-[40px] border border-slate-200 shadow-sm hover:shadow-xl transition-all relative overflow-hidden group">
            <div className="relative aspect-square mb-6">
                <canvas ref={canvasRef} className="w-full h-full rounded-full" />
                <div className="absolute top-0 left-0 bg-indigo-600 text-white w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black shadow-lg">
                    {index}
                </div>
            </div>

            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-3xl border border-slate-100">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Layout Seguro</span>
                    <span className="text-xs font-bold text-indigo-600 uppercase">{k} Tamanhos Únicos</span>
                </div>
                <button
                    onClick={download}
                    className="p-3 bg-slate-900 text-white rounded-xl hover:bg-indigo-600 transition-all shadow-lg"
                >
                    <Download size={20} />
                </button>
            </div>
        </div>
    );
};

export default App;