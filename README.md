# Leque Studio — Motion 3D

Editor web com folhas construídas a partir do contorno do símbolo fornecido. Cada folha gira em três dimensões com pivô no centro da borda inferior. Frente e verso têm tonalidades diferentes, e a profundidade determina as sobreposições.

## Executar
Requer Node.js 22 ou superior.

    npm ci
    npm run dev

Abra http://127.0.0.1:4173. Após editar: npm run build e recarregue. A pasta dist contém a aplicação estática com as bibliotecas incluídas, pronta para hospedagem HTTPS.

## Controles
1–16 folhas, distribuição circular, orientação, elevação da câmera, escala, defasagem, cores individuais, formatos, movimento e curva Bézier. O pivô inferior fica fixo durante a animação; o giro é calculado pelo tempo absoluto e fecha o ciclo. Volume 3D aplica um gradiente sutil na largura de cada folha (mais escuro nas bordas, com um realce no meio), simulando a seção arredondada de um tubo; no modo 3D é uma shading real por fragmento, no modo leque é um gradiente linear na mesma faixa de coordenadas do símbolo. Brilho aplica um post-processing de bloom aditivo (halo desfocado em múltiplas passadas) ao redor das folhas, com a própria borda da forma suavizada em gradiente — em vez de um contorno vetorial nítido — e um grão animado sobreposto que só aparece sobre áreas com brilho. Intensidade, alcance e grão são ajustáveis; os dois efeitos funcionam nos dois modos, independem da cor de fundo e podem ser combinados.

## Exportações
PNG do quadro selecionado, com opção de transparência. MP4 H.264 do ciclo completo, com fundo opaco, progresso e cancelamento. Exportações usam um renderizador 3D separado e as mesmas transformações da prévia. O seletor Modo alterna entre 3D e leque vetorial. No modo leque, SVG editável está disponível, além de PNG e MP4. Cada modo mantém seus ajustes ao alternar durante a sessão. MP4 depende do codificador do navegador. Volume 3D e Brilho são aplicados a PNG e MP4; o SVG exporta o Volume 3D como gradientes lineares reais (um por folha), mas não inclui o Brilho.

## Verificação
npm test verifica geometria, pivô inferior e continuidade do giro. npm run build atualiza dist. Interface, mudança de formato, 16 folhas, geração de PNG e MP4 e cancelamento foram testados no navegador. O navegador confirmou as exportações; os novos arquivos não foram inspecionados fora dele.


Distribuição circular: em 360 graus, o intervalo é 360/quantidade, incluindo o fechamento. No modo 3D, Fase do ciclo desloca o conjunto inteiro e preserva o espaçamento. Aberturas menores produzem um arco centrado.

Paleta oficial: #FFAAAB, #F0FFBF, #CCFA36 e #FF4347. Novas folhas recebem essas cores em sequência cíclica, mesmo após alterações personalizadas. Presets individuais e aplicação da paleta completa disponíveis em ambos os modos. Frente e verso usam a cor escolhida sem escurecimento automático.
