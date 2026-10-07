# WebRTS

RTS local no navegador com mapa procedural, economia por cidade, tropas terrestres, diplomacia e bots. Partidas não persistem entre recargas. Não há navegação naval nem multiplayer em rede nesta versão.

## Executar

```bash
npm install
npm run dev
npm test
npm run build
```

## Arquitetura

- `apps/client/renderer`: PixiJS 8, terreno/propriedade em chunks, câmera, minimapa e interpolação de tropas.
- `apps/client/ui`: preparação, economia, construção, seleção/ordens militares e diplomacia.
- `packages/map`: geração determinística por seed, coordenadas axiais, depósitos e massas terrestres.
- `packages/simulation`: estado autoritativo, economia, diplomacia, combate, captura e vitória, sem DOM.
- `packages/simulation/worker.ts`: relógio de 20 Hz, comandos validados e buffers transferíveis reciclados.
- `packages/ai`: decisões em cadências distintas, modelos econômicos e percepção incompleta.
- `packages/shared/configs`: regras e balanceamento.
- `packages/testing`: testes funcionais e simulações reproduzíveis.

A economia atualiza a 2 Hz; movimento e combate rodam a 20 Hz. Snapshots militares usam TypedArrays e backpressure. O teste de carga sintético continua separado de tropas e nunca conquista território. Tamanhos de mapa: 3.072, 8.480 e 19.200 hexágonos no mesmo mundo de 6 × 4 km. Ao distribuir países, o gerador prefere a maior massa terrestre quando comporta todos, mantendo o fallback para mapas mais fragmentados.

## Economia

Cada país começa com uma cidade, 80 habitantes, capacidade de 300, 26,4 Construtores e estoques de 100 dinheiro / 120 comida / 0 minério / 10 combustível. A primeira Fazenda e primeira Mina por país dispensam materiais uma única vez; ainda exigem Construtores. Destruição/demolição não restitui esses direitos nem recursos.

Construtores são consumidos na construção: máximo de 33% da população civil, recuperação com raiz quadrada da população e satisfação alimentar. A produção acompanha a disponibilidade de comida e insumos. Cada cidade possui crescimento, capacidade, excedentes e consumo próprios; habitantes excedentes consomem mais e crescem menos. A população pode migrar para moradia disponível, sem criar habitantes. Recrutamento retira pessoas de cidades reais e mantém a reserva mínima civil.

| Estrutura | Dinheiro | Minério | Comida | Combustível | Construtores |
| --- | ---: | ---: | ---: | ---: | ---: |
| Cidade | 950 | 350 | 320 | — | 55 |
| Fábrica | 850 | 180 | — | 50 | 45 |
| Fazenda | 300 | 45 | — | — | 15 |
| Mina | 480 | 60 | — | — | 20 |
| Quartel | 750 | 80 | — | — | 35 |
| Refinaria | 650 | 120 | — | — | 35 |
| Defesa | 300 | 45 | — | — | 12 |

Custos materiais são fixos. O HUD usa o mesmo cálculo autoritativo. Produção por minuto: Cidade 360 dinheiro; Fazenda 120 comida; Mina 120 minério; Refinaria 60 combustível; Fábrica 600 dinheiro consumindo 15 comida / 75 minério / 36 combustível. Depósitos correspondentes acrescentam até +100% proporcionalmente à área rica ocupada. Mina e Refinaria também consomem comida. Fábricas reduzem a operação proporcionalmente ao insumo limitante; habitantes e indústria existente comem primeiro.

## Tropas e território

| Unidade | Custos | População | Treinamento | HP | Velocidade | Ataque |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Infantaria | 75 dinheiro / 10 minério | 1 | 9 s | 100 | 55 | 10 |
| Tanque | 420 dinheiro / 80 minério / 30 combustível | 5 | 24 s | 500 | 35 | 60 |

Recursos e população são debitados ao entrar na fila. Treinamento é sequencial por Quartel. A retirada percorre rotas terrestres ao Quartel próprio; recuperação de 8 HP/s usa dinheiro e pode ser interrompida. Água, fronteiras e tratados continuam limitando rotas, descoberta e perseguição. Suprimento sofre desgaste fora do próprio território; falta prolongada causa atrito.

Selecione tropas e clique em inimigo para atacar. Botão direito move; Ctrl/Shift + botão direito acrescenta uma rota. Descoberta automática respeita as regras de passagem. Defesa patrulha fronteiras e responde a ameaças. Movimentar ou parar cancela perseguição/ordem explícita de destruição.

Diplomacia permite alianças, preparação de guerra, participação/apoio de aliados e trégua. O humano responde às ofertas recebidas. Preparação humana mantém os 15 s canônicos; bots também exigem reservas, justificativa estratégica e preparação adicional. A conquista de aliados participantes é atribuída ao líder de seu lado da guerra.

Domínio territorial exige 55% de toda a terra, incluindo neutros, mantidos por 90 s por padrão. O período pode ser configurado na preparação. Conquistar todas as cidades adversárias também vence. Pausa congela o relógio e o resultado final congela comandos de gameplay.

## IA Utility e balanceamento de partidas

A IA usa previsões de produção/consumo e de crescimento por cidade, reservas, objetivos concorrentes e estados de desenvolvimento, expansão, tensão, preparação, guerra, crise e recuperação. As decisões econômicas rodam a cada 3 s, estratégia a cada 7 s, operações militares a cada 1,5 s e diplomacia a cada 12 s, com variações de dificuldade e tarefas adiadas quando acaba o orçamento de ordens. Moral, reputação, relações, ameaças e memória são mantidas no Worker e não aparecem nos snapshots normais.

Os bots observam território próprio, vizinhança e um raio de visão de tropas/estruturas. Informações militares antigas perdem confiança; perseguições param quando o alvo sai da visão do bot. Não há recursos ou população extras por dificuldade. As três personalidades variam os pesos das decisões, orçamento militar e preferências diplomáticas.

Configuração central em `packages/shared/configs/`: `ai.ts`, `economy.ts`, `social.ts`, `pacing.ts`, `combat.ts` (`MILITARY_CONFIG`), `units.ts`, `training.ts` e `victory.ts`. Tempos de pacing são referências para medir partidas e não iniciam guerras nem encerram a simulação.

Os custos de estruturas são fixos durante toda a partida; a primeira Fazenda/Mina continua sem materiais, com Construtores pagos e direitos permanentes. Quartéis são pagos. População excedente muda gradualmente para cidades com moradia livre, conservando habitantes. Bots reservam espaço para seu primeiro Quartel.

Estruturas militares podem ser atacadas automaticamente. As econômicas e cidades são preservadas: ocupação sem defensores transfere o prédio e toda sua capacidade produtiva/população. Clique numa estrutura inimiga com tropas selecionadas para dar ordem explícita de destruição; mover/parar cancela essa ordem. A última cidade capturada causa rendição territorial e preserva a infraestrutura. Bots também podem capitular diante de perdas militares, territoriais e esgotamento nacional combinados; nenhum relógio força rendição. Uma pequena fração dos estoques passa ao vencedor, com consumo populacional e abastecimento industrial contendo o ganho.

A vitória por domínio considera 55% de **toda** a terra (incluindo terra neutra), mantidos por 90 s por padrão; o tempo continua ajustável na preparação. A conquista de todas as cidades adversárias também vence. O limiar foi reduzido para que vantagem estratégica possa finalizar a partida sem exigir ocupar quase toda a geografia. A meta de 15–25 minutos precisa ser medida em lotes de seeds; consulte o relatório para os resultados e partidas censuradas.

### Debug e simulações

Abra o jogo com `?aiDebug=1`. O painel interno mostra objetivos e razões, previsões por recurso, estados, reservas, indicadores sociais, guerra, forças, filas, visão/memória e permite exportar telemetria em JSON. Não é exibido no jogo normal.

```bash
WEBRTS_BALANCE=1 WEBRTS_BALANCE_COUNT=20 npm test -- packages/testing/ai-balance.sim.test.ts
```

O runner joga partidas completas só com bots, sem modificar estoques, pagamento, treinamento, combate, descoberta ou regras de vitória. Usa o passo normal de produção, 0,05 s (20 Hz). `WEBRTS_BALANCE_DT=.25` habilita triagem mais rápida, cujos resultados não substituem o lote em 20 Hz. Também aceita `WEBRTS_BALANCE_SIZE=small|medium|large`, `WEBRTS_BALANCE_START` e `WEBRTS_BALANCE_REPORT` para comparar lotes sem sobrescrever relatórios. O limite de 35 minutos **censura a medição**, sem encerrar uma partida ou inventar vencedor. O resultado contém duração, marcos, guerras, cidades conquistadas, população, força, renda, produção/consumo/saldo, estoques, construções e países restantes. Médias de duração incluem somente partidas realmente terminadas; atrasos acima de 30 minutos incluem censuradas.

Mapa sem malha visível. O cursor mostra a aptidão do terreno e contorna apenas o footprint da estrutura. Estruturas sem sprite usam fundo do país. Descoberta expande a fronteira em anéis a partir da cidade própria mais próxima da ordem.

Territórios iniciais: raio de 3 hexágonos, com três anéis completos (37 células terrestres), sem alongamento junto à costa.

Contornos permanentes aparecem apenas na fronteira do país. Cidades e construções usam contorno somente durante o hover.

Descoberta é individual mesmo em seleção múltipla. Cada explorador verifica posições e destinos de exploradores próprios e aliados, reservando dois hexágonos de distância. Frentes ocupadas aguardam e reavaliam espaço; ordens manuais, mortes e mudança de modo liberam a reserva. Prioridade estável evita que dois exploradores cancelem as rotas um do outro.

## Version 33 — larger maps, rivers and preparation

Map sizes now contain exactly 30,000, 100,000 and 200,000 cells, including water. Generation stays in the simulation worker. Terrain uses an overview texture at distant zoom and creates detailed visible chunks on demand; the minimap caches ownership between border changes. Geographic region seed counts are bounded. Oil deposits predominantly occupy a single hex, with separated small irregular deposits; mineral and fertile patches use randomized growth.

Rivers form connected one-hex channels toward existing water. The eighth construction is a bridge: 150 money, 40 mineral and 8 builders at fixed costs, 450 HP, one river hex, opposing land banks and one owned bank required. It has an automatic orientation and creates a live walkable crossing without changing water into land. Destruction closes the crossing; active routes are refreshed and units on a removed bridge return to their last land position. Discovery respects bridge ownership and alliances. Bots can invest in nearby bridges after basic infrastructure.

Map settings are closed by default and opened from country selection. Setup statistics, resource legends and debug layer toggles have been removed. Start preparation opens a 30-second real-time territory selection phase with economy and armies stopped. Any full valid radius-three land area can be selected by clicking its anchor and confirming “Escolher terreno”. Reservations require at least ten hexes between centers, are final and apply to bots too. Bots reserve from five seconds onward; unconfirmed players receive a valid automatic location at the deadline. All confirmations can start the match early. The existing maximum remains eight countries (one player and seven bots).

Route search uses neighboring terrain hexes and smooths to continuous world-space waypoints. Polygon clipping includes a small numerical clearance and movement checks stored Float32 positions to prevent corner crossings into forbidden territory. Discovery frontier queries use indexed owned cells, with cached reachability instead of scanning and sorting the full map for every scout.

Validation: build and automated map, navigation, economy, diplomacy, troop and preparation regression tests. Managed browser QA is unavailable in this session; no browser FPS measurements have been collected. Long simulation test deadlines accommodate the larger minimum map.

## Version 34 — smaller maps and radius-four starts

Map presets are now 20,000 (160 × 125), 30,000 (200 × 150), and 50,000 (250 × 200) total hexagons, including water. Initial territories use four complete rings around their central hexagon: 61 cells per country. Selection, automatic bot placement and timeout fallback use the same shared radius; city footprints remain seven cells. Setup labels and preparation validation messages match the new values.

## Navigation freeze fix
Connectivity checks now reuse walkable connected components instead of running a full route search for every candidate on an unreachable island. Creating or destroying a bridge increments the map topology revision and invalidates those components. Automatic orders keep a maximum of twelve reachable destination attempts per order, so disconnected targets cannot trigger repeated exhaustive path searches before unrelated troops move.

## Economia e recrutamento territorial
Cidades comportam 300 civis, com crescimento gradual e transferência de 20 moradores existentes ao fundar uma nova cidade. A primeira fazenda e mina continuam gratuitas em materiais. A fábrica custa 850 dinheiro, 180 minério e 50 combustível; produz 600 dinheiro/min e consome 15 comida, 75 minério e 36 combustível/min em operação plena. O bônus de solo é 1 + hexágonos ricos / área ocupada (mina: 33,33% por hex; fazenda: 25%; refinaria: 100%). Prévias e detalhes mostram a cobertura e produção. Bots usam a mesma avaliação proporcional.
O quartel reserva 1 civil por infantaria e 5 por tanque, nas cidades próprias mais próximas, preservando 20 por cidade e 60 no país. A fila registra a origem e devolve os recrutas não treinados à cidade de origem se o quartel for perdido; cidades perdidas usam redistribuição para cidades ainda próprias. O HUD distingue civis, militares e população total, incluindo treinamento.

## Portos, aviação e mísseis

- **Construir (B / martelo):** categorias Expansão, Economia, Logística e Militar. Clique para posicionar; arraste uma opção para a hotbar dentro do menu para trocar favoritos. Favoritos persistem no navegador. Ordem inicial: cidade, quartel, fábrica, porto, fazenda, mina, refinaria, defesa, ponte e silo (1–0).
- **X:** sem tropas selecionadas, ativa cancelamento de obras próprias, com devolução integral dos materiais efetivamente pagos e dos construtores reservados. Estruturas concluídas continuam sujeitas a destruição por inimigos, mas não a demolição voluntária. Primeiras construções gratuitas não renovam sua gratuidade quando canceladas.
- **Porto:** um hexágono terrestre adjacente a água. Ordens entre ilhas procuram porto próprio/aliado alcançável, água conectada e costa acessível ao destino. Embarque misto de 50 pontos (soldado 1; tanque 5), um barco carregando por porto, partida lotada ou após 5 s sem chegada (máximo 20 s). Há desembarque em portos aliados e em costas neutras/inimigas em guerra. Clique no porto para acompanhar e selecionar barcos. Barcos militares e de carga aceitam movimento manual e rotas adicionais. Afundamento perde todos os passageiros.
- **Comércio:** uma rota por porto, entre países distintos em paz, sem exigir aliança. Dinheiro é creditado somente na volta completa; distância navegada tem remuneração limitada. Destino ganha uma parcela. Guerra/tensão ou destruição do destino suspendem a rota. Controle manual interrompe comércio; o botão Retomar comércio retorna à origem e reinicia o ciclo sem pagar por uma volta parcial.
- **Avião de guerra:** treinado no quartel (40 s), cruza água, faz passagens de ataque e não ocupa/conquista terrenos. Suprimento diminui longe de quartéis, recupera próximo de quartéis próprios/aliados e causa desgaste de vida ao zerar, com aviso. Retorno automático por avião, habilitado inicialmente, usa 15% de reserva. Infantaria/tanques causam dano reduzido; torres têm bônus antiaéreo e naval.
- **Silo:** um por país, custo de 12.000 dinheiro, 3.000 minério e 1.800 combustível; construção de 90 s. Clique para produzir um MT-3 (raio 3) ou ME-8 (raio 8), aguarde e selecione novamente para mirar. Prévia da área e confirmação antes do disparo. Alvo central exige guerra; dano decai com distância, também atinge aliados e é calculado uma vez por estrutura. Há aviso e intervalo de 10/15 s até impacto. Mísseis não transferem território.
- **Bots:** seguem os mesmos custos, limites e comandos. Investem em portos, fazem comércio, transportam expedições para costas descobertas, recrutam e abastecem aviões e usam silos em economia avançada. Selecionam o tipo de míssil considerando alvos conhecidos e estruturas amigas na área.

Parâmetros provisórios de balanceamento estão em `packages/shared/configs/operations.ts`, `units.ts` e `buildings.ts`. As rotas aquáticas e os planos de transporte são compartilhados e limitados em cache; passageiros são excluídos dos snapshots visuais, movimento, combate, ocupação e desgaste terrestre.

Verificação funcional: `npm test -- --maxWorkers=2 --testTimeout=20000`. O cenário naval/aviação/mísseis inclui integração dos bots e o protocolo compacto de snapshots. Validação visual de navegador depende da infraestrutura de preview disponível.

## Terreno detalhado e zoom estratégico

O mapa tem três representações pelo tamanho do hexágono na tela: estratégica, tática e detalhada. Texturas transparentes de terreno usam um atlas compartilhado, com seis variantes determinísticas para gramado, vegetação seca, solo fértil, rocha, jazida de combustível, mar e rio. A distribuição de cor usa ruído espacial contínuo; os detalhes das margens e os arbustos não alteram o terreno lógico, recursos, colisões ou rotas.

A visão distante reutiliza duas pequenas imagens do mapa (com e sem recursos). Os trechos de 16×16 células são preparados apenas quando entram na câmera, com orçamento de três bases e dois trechos de detalhe por quadro; até 48 bases e 24 trechos detalhados ficam em cache. O cache substitui trechos antigos ao navegar. Reflexos próximos usam no máximo 32 ondas e atualização limitada.

Construções usam seus sprites existentes de perto. Ao afastar, mostram o footprint completo na cor do país e um ícone central de alto contraste. Indicadores de construção, dano e míssil pronto permanecem; ícones coincidentes são reduzidos na visão distante. Unidades não selecionadas são agrupadas visualmente no zoom extremo por país, tipo e proximidade; ordens, posições e seleção continuam individuais.

**A engrenagem no canto superior direito, sobre o minimapa**, controla visão automática/estratégica, recursos, regiões, reflexos, diplomacia e alcance das torres. **V** alterna a representação estratégica. Preferências persistem no navegador; movimento reduzido desliga reflexos na primeira visita. Diplomacia repinta os trechos existentes por relação, e os círculos de torres usam o alcance real de combate.

Validação: testes de LOD, estabilidade da seed, substituição do cache após percorrer o mapa, seleção/agrupamento, footprints e captura; regressões de sprites, hover e fronteiras; TypeScript e build de produção. Arte procedural inspecionada em imagem; a infraestrutura de browser QA não está disponível nesta sessão.
