' =====================================================================
'  Robo ORDENS - Central de Abastecimento
'  Autor: Lucas (matricula CBK3574) - GitHub: https://github.com/lucasdpr
'  Projeto: https://github.com/lucasdpr/abastecimentocsn
'  Monta a planilha base PLANEJAMENTO OFICINA e atualiza o app:
'   1) IW38      ordens dos grupos de planejamento
'   2) ZPMX0018  itens de reserva dessas ordens (a base, layout /ERICA)
'   3) IWBK      texto da reserva          (pelas ordens)
'   4) ZMR37     tipo de MRP               (pelos materiais)
'   5) MELB      RC e pedido de cada reserva+item (no de acompanhamento)
'   6) ME5A      item e data da RC          (pelo no de acompanhamento)
'   7) ME2M      item e data de remessa do pedido (pelos materiais)
'   8) Monta a planilha base (mantendo as colunas preenchidas a mao)
'   9) Envia para o app a planilha base e a IW38 (status das ordens)
'
'  E o unico robo: substitui o antigo robo IW38 (pode apagar o robo-iw38.vbs).
'
'  SAP precisa estar ABERTO e LOGADO. Uso: dois cliques.
'  Para rodar sem janelas (Agendador do Windows):
'       wscript.exe robo-ordens.vbs /silencioso
'  Historico de cada execucao: Desktop\robo ordens\historico.txt
'
'  ATENCAO: este arquivo contem a CHAVE DO ROBO. Nao envie por e-mail
'  nem deixe em pasta compartilhada.
' =====================================================================
Option Explicit

Const URL_APP = "{{URL_APP}}"
Const TOKEN = "{{TOKEN}}"
Const FORMATO_XLSX = "10"
' A Vercel aceita ~4,5 MB por envio: planilhas maiores vao em partes.
Const PARTE_BYTES = 3000000

Const PLANILHA_BASE = "PLANEJAMENTO_OFICINA_2026-2027.xlsx"
Const DATA_DE = "13.09.2021"
Const DATA_ATE = "31.12.2029"
Const CENTRO = "01"
Const IW38_LAYOUT = "/CLAUDINEIA"
Const ZPM_LAYOUT = "/ERICA"
Const IWBK_LAYOUT = "/LUGMLC"
Const ME5A_LAYOUT = "/LAS-KF"
Dim GRUPOS : GRUPOS = Array("5I6", "5I7", "5I8", "5IS", "5I3", "5I5", "8IS", "8IT")

Dim fso, sh, silencioso, historico, desktop, pastaOrdens, pastaSap, pastaBackup, xl
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
Set xl = Nothing
desktop = sh.ExpandEnvironmentStrings("%USERPROFILE%") & "\Desktop"
pastaOrdens = desktop & "\robo ordens"
pastaSap = pastaOrdens & "\relatorios SAP"
pastaBackup = pastaOrdens & "\backup"
CriarPasta pastaOrdens
CriarPasta pastaSap
CriarPasta pastaBackup
historico = pastaOrdens & "\historico.txt"
silencioso = False
If WScript.Arguments.Count > 0 Then silencioso = (LCase(WScript.Arguments(0)) = "/silencioso")

' So um robo por vez mexendo no SAP (evita dois cliques rodarem dois robos juntos).
' O arquivo fica aberto enquanto o robo roda; o Windows solta sozinho quando ele termina.
Dim trava
On Error Resume Next
Set trava = fso.OpenTextFile(sh.ExpandEnvironmentStrings("%TEMP%") & "\robo_sap.trava", 2, True)
If Err.Number <> 0 Then
  If Not silencioso Then MsgBox "O robo ja esta rodando neste PC. Espere ele terminar.", vbExclamation, "Robo ORDENS"
  WScript.Quit 1
End If
On Error GoTo 0

' ---------- 0. SAP aberto e logado; planilha base na pasta ----------
Dim SapGuiAuto, application, connection, session
On Error Resume Next
Set SapGuiAuto = GetObject("SAPGUI")
If Err.Number <> 0 Then Falhar "O SAP nao esta aberto. Abra o SAP, faca login e rode o robo de novo."
Set application = SapGuiAuto.GetScriptingEngine
Set connection = application.Children(0)
Set session = connection.Children(0)
If Err.Number <> 0 Then Falhar "Nao achei uma sessao do SAP logada. Faca login e rode de novo."
On Error GoTo 0

Dim caminhoBase
caminhoBase = pastaOrdens & "\" & PLANILHA_BASE
If Not fso.FileExists(caminhoBase) Then Falhar "Nao achei a planilha base " & caminhoBase & vbCrLf & _
  "Coloque a planilha atual (com as colunas preenchidas a mao) nessa pasta, com esse nome, e rode de novo."

If Not silencioso Then
  If MsgBox("O robo vai usar o SAP por varios minutos (IW38, ZPMX0018, IWBK, ZMR37, MELB, ME5A e ME2M)." & vbCrLf & _
            "Nao mexa no SAP nem no Excel ate aparecer a mensagem de fim." & vbCrLf & _
            "A planilha " & PLANILHA_BASE & " precisa estar FECHADA." & vbCrLf & vbCrLf & "Continuar?", _
            vbOKCancel + vbInformation, "Robo ORDENS") <> vbOK Then WScript.Quit 0
End If
Registrar "Inicio"

Dim i, r, ac, doc, desde

' ---------- 1. IW38: ordens dos grupos ----------
Inicio "IW38"
On Error Resume Next
session.findById("wnd[0]/usr/chkDY_MAB").selected = True
session.findById("wnd[0]/usr/ctxtDATUV").text = DATA_DE
session.findById("wnd[0]/usr/ctxtDATUB").text = DATA_ATE
session.findById("wnd[0]/usr/btn%_INGPR_%_APP_%-VALU_PUSH").press
For i = 0 To UBound(GRUPOS)
  session.findById("wnd[1]/usr/tabsTAB_STRIP/tabpSIVA/ssubSCREEN_HEADER:SAPLALDB:3010/tblSAPLALDBSINGLE/ctxtRSCSEL_255-SLOW_I[1," & i & "]").text = GRUPOS(i)
Next
session.findById("wnd[1]/tbar[0]/btn[8]").press
session.findById("wnd[0]/usr/ctxtVARIANT").text = IW38_LAYOUT
Checar "preencher a IW38"
Executar
If Not Existe("wnd[0]/usr/cntlGRID1/shellcont/shell") Then Falhar "A IW38 nao retornou a lista (nenhuma ordem ou tela diferente da esperada)."
Dim arqIw38
arqIw38 = pastaSap & "\IW38.xlsx"
Apagar arqIw38
desde = Now
session.findById("wnd[0]/usr/cntlGRID1/shellcont/shell").setCurrentCell -1, ""
session.findById("wnd[0]/usr/cntlGRID1/shellcont/shell").selectAll
session.findById("wnd[0]/usr/cntlGRID1/shellcont/shell").contextMenu
session.findById("wnd[0]/usr/cntlGRID1/shellcont/shell").selectContextMenuItem "&XXL"
SalvarComo pastaSap, "IW38.xlsx"
Checar "exportar a IW38"
On Error GoTo 0
EsperarArquivo arqIw38, desde
Dim iw38 : iw38 = LerXlsx(arqIw38)
Dim ordens : ordens = ValoresUnicos(iw38, Coluna(iw38, Array("ordem"), True), False)
Registrar "IW38: " & (UBound(ordens) + 1) & " ordens"

' ---------- 2. ZPMX0018: itens de reserva (a base) ----------
Inicio "ZPMX0018"
EsperarCampo "wnd[0]/usr/ctxtS_SWERK-LOW", "ZPMX0018"
Preencher "wnd[0]/usr/chkP_ENCE", True
Preencher "wnd[0]/usr/ctxtS_SWERK-LOW", CENTRO
Preencher "wnd[0]/usr/ctxtS_ERDAT-LOW", DATA_DE
Preencher "wnd[0]/usr/ctxtS_ERDAT-HIGH", DATA_ATE
On Error Resume Next
ColarLista "wnd[0]/usr/btn%_S_AUFNR_%_APP_%-VALU_PUSH", ordens
Checar "colar as ordens na ZPMX0018"
On Error GoTo 0
Preencher "wnd[0]/usr/ctxtP_LAYOUT", ZPM_LAYOUT
On Error Resume Next
Executar
If Not Existe("wnd[0]/usr/cntlCC_ALV/shellcont/shell") Then Falhar "A ZPMX0018 nao retornou a lista (nenhum item ou tela diferente da esperada)."
Dim arqZpm
arqZpm = pastaSap & "\ZPMX0018.xlsx"
Apagar arqZpm
desde = Now
session.findById("wnd[0]/usr/cntlCC_ALV/shellcont/shell").pressToolbarContextButton "&MB_EXPORT"
session.findById("wnd[0]/usr/cntlCC_ALV/shellcont/shell").selectContextMenuItem "&XXL"
SalvarComo pastaSap, "ZPMX0018.xlsx"
Checar "exportar a ZPMX0018"
On Error GoTo 0
EsperarArquivo arqZpm, desde
Dim zpm : zpm = LerXlsx(arqZpm)
Dim zReserva, zItem, zMaterial, zGpm
zReserva = Coluna(zpm, Array("no reserva", "noreser."), True)
zItem = Coluna(zpm, Array("no item reserva transferencia", "item"), True)
zMaterial = Coluna(zpm, Array("material"), True)
zGpm = Coluna(zpm, Array("grp.plnj.pm", "gpm"), False)
Dim ordensBase : ordensBase = ValoresUnicos(zpm, Coluna(zpm, Array("ordem"), True), False)
Dim materiais : materiais = ValoresUnicos(zpm, zMaterial, True)
Dim zElim : zElim = Coluna(zpm, Array("item foi eliminado", "eli"), False)
Dim zStatus : zStatus = Coluna(zpm, Array("status do item", "stat item"), False)
' RC e pedido so interessam para itens nao eliminados (sao ~1/6 da base e o SAP aguenta colar).
Dim acomps : acomps = Acompanhamentos(zpm, zReserva, zItem, zElim, zStatus)
Registrar "ZPMX0018: " & (UBound(zpm, 1) - 1) & " itens, " & (UBound(materiais) + 1) & " materiais, " & (UBound(acomps) + 1) & " reservas/itens nao eliminados"

' ---------- 3. IWBK: texto da reserva ----------
Inicio "IWBK"
On Error Resume Next
session.findById("wnd[0]/usr/chkABGES").selected = True
ColarLista "wnd[0]/usr/btn%_AUFNR_%_APP_%-VALU_PUSH", ordensBase
session.findById("wnd[0]/usr/ctxtP_VARI").text = IWBK_LAYOUT
Checar "preencher a IWBK"
Executar
On Error GoTo 0
Dim textos : Set textos = CreateObject("Scripting.Dictionary")
If ExportarPeloMenu("wnd[0]/mbar/menu[0]/menu[3]/menu[1]", "IWBK.xlsx") Then
  Dim iwbk : iwbk = LerXlsx(pastaSap & "\IWBK.xlsx")
  Dim wRes, wItem, wTexto
  wRes = Coluna(iwbk, Array("no reserva"), True)
  wItem = Coluna(iwbk, Array("no item reserva transferencia", "item"), True)
  wTexto = Coluna(iwbk, Array("texto de item 1a linha", "texto de item"), True)
  For r = 2 To UBound(iwbk, 1)
    If Trim(CStr(iwbk(r, wTexto) & "")) <> "" Then textos(SemZeros(iwbk(r, wRes)) & SemZeros(iwbk(r, wItem))) = Trim(CStr(iwbk(r, wTexto)))
  Next
End If
Registrar "IWBK: " & textos.Count & " textos de reserva"

' ---------- 4. ZMR37: tipo de MRP ----------
Inicio "ZMR37"
On Error Resume Next
session.findById("wnd[0]/usr/ctxtV_CENTRO-LOW").text = CENTRO
ColarLista "wnd[0]/usr/btn%_V_MATER_%_APP_%-VALU_PUSH", materiais
session.findById("wnd[0]/usr/chkP_CONSO").selected = True
Checar "preencher a ZMR37"
Executar
On Error GoTo 0
Dim mrps : Set mrps = CreateObject("Scripting.Dictionary")
If ExportarPeloMenu("wnd[0]/mbar/menu[0]/menu[3]/menu[1]", "ZMR37.xlsx") Then
  Dim zmr : zmr = LerXlsx(pastaSap & "\ZMR37.xlsx")
  Dim mMat, mTipo
  mMat = Coluna(zmr, Array("material"), True)
  mTipo = Coluna(zmr, Array("tipo de mrp", "tpm"), True)
  For r = 2 To UBound(zmr, 1)
    mrps(SemZeros(zmr(r, mMat))) = Trim(CStr(zmr(r, mTipo) & ""))
  Next
End If
Registrar "ZMR37: MRP de " & mrps.Count & " materiais"

' ---------- 5. MELB: RC e pedido de cada no de acompanhamento ----------
Inicio "MELB"
On Error Resume Next
ColarLista "wnd[0]/usr/btn%_EB_BEDNR_%_APP_%-VALU_PUSH", acomps
session.findById("wnd[0]/usr/ctxtS_WERKS-LOW").text = CENTRO
Checar "preencher a MELB"
Executar
On Error GoTo 0
Dim rcsDe : Set rcsDe = CreateObject("Scripting.Dictionary")
Dim posDe : Set posDe = CreateObject("Scripting.Dictionary")
If ExportarTexto("MELB.txt") Then
  Dim melb : melb = LerTexto(pastaSap & "\MELB.txt", "doc.compra")
  Dim bAc, bCtg, bDoc, bE, ctg, elim
  bAc = Coluna(melb, Array("no acomp.", "no acompanhamento"), True)
  bCtg = Coluna(melb, Array("ctg.doc.compras"), True)
  bDoc = Coluna(melb, Array("doc.compra", "documento de compras"), True)
  bE = Coluna(melb, Array("e", "codigo de eliminacao"), False)
  For r = 2 To UBound(melb, 1)
    ac = SemZeros(melb(r, bAc))
    doc = SemZeros(melb(r, bDoc))
    ctg = Normalizar(melb(r, bCtg))
    elim = ""
    If bE > 0 Then elim = UCase(Trim(melb(r, bE) & ""))
    If ac <> "" And doc <> "" Then
      ' RC eliminada (X) e pedido eliminado (L) nao entram.
      If Left(ctg, 7) = "requisi" And elim <> "X" Then Acrescentar rcsDe, ac, doc
      If Left(ctg, 6) = "pedido" And elim <> "L" Then Acrescentar posDe, ac, doc
    End If
  Next
End If
Registrar "MELB: RC em " & rcsDe.Count & " e pedido em " & posDe.Count & " reservas/itens"

' ---------- 6. ME5A: item e data da RC ----------
Inicio "ME5A"
On Error Resume Next
ColarLista "wnd[0]/usr/btn%_BA_BEDNR_%_APP_%-VALU_PUSH", acomps
session.findById("wnd[0]/usr/chkP_ERLBA").selected = True
session.findById("wnd[0]/usr/ctxtP_LSTUB").text = "ALV"
session.findById("wnd[0]/usr/ctxtS_WERKS-LOW").text = CENTRO
Checar "preencher a ME5A"
Executar
EscolherLayout ME5A_LAYOUT
On Error GoTo 0
Dim infoRc : Set infoRc = CreateObject("Scripting.Dictionary")
If ExportarTexto("ME5A.txt") Then
  Dim me5a : me5a = LerTexto(pastaSap & "\ME5A.txt", "reqc")
  If Not IsArray(me5a) Then me5a = LerTexto(pastaSap & "\ME5A.txt", "requisicao de compra")
  Dim aRc, aItem, aData, aAc, aMat
  aRc = Coluna(me5a, Array("reqc", "requisicao de compra"), True)
  aItem = Coluna(me5a, Array("item reqc", "item"), True)
  aData = Coluna(me5a, Array("dtasolic", "data da solicitacao"), True)
  aAc = Coluna(me5a, Array("no acomp.", "no acompanhamento"), False)
  aMat = Coluna(me5a, Array("material"), False)
  For r = 2 To UBound(me5a, 1)
    doc = SemZeros(me5a(r, aRc))
    ' Pelo no de acompanhamento quando o layout traz; senao pelo material.
    If aAc > 0 Then Juntar infoRc, SemZeros(me5a(r, aAc)) & "|" & doc, SemZeros(me5a(r, aItem)), DataTexto(me5a(r, aData))
    If aMat > 0 Then Juntar infoRc, SemZeros(me5a(r, aMat)) & "#" & doc, SemZeros(me5a(r, aItem)), DataTexto(me5a(r, aData))
  Next
End If
Registrar "ME5A: " & infoRc.Count & " RCs"

' ---------- 7. ME2M: item e data de remessa do pedido ----------
Inicio "ME2M"
On Error Resume Next
ColarLista "wnd[0]/usr/btn%_EM_MATNR_%_APP_%-VALU_PUSH", materiais
session.findById("wnd[0]/usr/ctxtEM_WERKS-LOW").text = CENTRO
session.findById("wnd[0]/usr/ctxtLISTU").text = "ALV"
Checar "preencher a ME2M"
Executar
' Visao "divisoes de remessa": traz a data de remessa
session.findById("wnd[0]/mbar/menu[3]/menu[0]/menu[1]").select
Err.Clear
On Error GoTo 0
Dim infoPo : Set infoPo = CreateObject("Scripting.Dictionary")
If ExportarTexto("ME2M.txt") Then
  Dim me2m : me2m = LerTexto(pastaSap & "\ME2M.txt", "doc.compra")
  Dim pAc, pDoc, pItem, pData
  pAc = Coluna(me2m, Array("no acomp.", "no acompanhamento"), True)
  pDoc = Coluna(me2m, Array("doc.compra", "documento de compras"), True)
  pItem = Coluna(me2m, Array("itm", "item"), True)
  pData = Coluna(me2m, Array("datarem.", "data de remessa"), True)
  For r = 2 To UBound(me2m, 1)
    Juntar infoPo, SemZeros(me2m(r, pAc)) & "|" & SemZeros(me2m(r, pDoc)), SemZeros(me2m(r, pItem)), DataTexto(me2m(r, pData))
  Next
End If
Registrar "ME2M: " & infoPo.Count & " pedidos/itens"
On Error Resume Next
session.findById("wnd[0]/tbar[0]/okcd").text = "/n"
session.findById("wnd[0]").sendVKey 0
On Error GoTo 0

' ---------- 8. Monta a planilha base ----------
Dim resumo : resumo = MontarPlanilhaBase()
Registrar resumo

' ---------- 9. Envia para o app ----------
Dim resultado, resultadoIw38
resultado = EnviarPlanilha(caminhoBase, PLANILHA_BASE)
Registrar resultado
' IW38 tambem vai para o app: status SAP das ordens e OMs sem itens de material
resultadoIw38 = EnviarPlanilha(arqIw38, "IW38.xlsx")
Registrar resultadoIw38
FecharExcel
If Not silencioso Then MsgBox "Pronto. Planilha base atualizada e app atualizado:" & vbCrLf & vbCrLf & resumo & vbCrLf & vbCrLf & resultado & vbCrLf & resultadoIw38, vbInformation, "Robo ORDENS"


' =====================================================================
'  Planilha base
' =====================================================================
Function MontarPlanilhaBase()
  Dim copiaBackup, wb, ws, wsGrupos, s, ant, nAnt, nCols, c, cab, h, porChave, gr, n, k, linha, v
  Dim mat, gpm, msg, zc, resp
  Dim nRc, nPo, nTexto, nMrp, nManual, manuais, faltando
  Set manuais = CreateObject("Scripting.Dictionary")
  For Each h In Array("status do processo", "observacao", "status rc", "status po", "apoio", "nova data")
    manuais(h) = True
  Next
  Set faltando = CreateObject("Scripting.Dictionary")
  nRc = 0 : nPo = 0 : nTexto = 0 : nMrp = 0 : nManual = 0
  ' Copia de seguranca antes de mexer
  copiaBackup = pastaBackup & "\" & Replace(PLANILHA_BASE, ".xlsx", "") & "_" & Year(Now) & Dois(Month(Now)) & Dois(Day(Now)) & "_" & Dois(Hour(Now)) & Dois(Minute(Now)) & ".xlsx"
  On Error Resume Next
  fso.CopyFile caminhoBase, copiaBackup, True
  If Err.Number <> 0 Then Falhar "Nao consegui copiar a planilha base para o backup (ela esta aberta?): " & Err.Description
  On Error GoTo 0

  AbrirExcel
  On Error Resume Next
  Set wb = xl.Workbooks.Open(caminhoBase, 0)
  If Err.Number <> 0 Then Falhar "O Excel nao abriu a planilha base: " & Err.Description
  On Error GoTo 0
  If wb.ReadOnly Then
    wb.Close False
    Falhar "A planilha base esta aberta por alguem (" & caminhoBase & "). Feche e rode de novo. Nada foi alterado."
  End If
  Set ws = wb.Worksheets(1)
  Set wsGrupos = Nothing
  For Each s In wb.Worksheets
    If Left(Normalizar(s.Name), 21) = "grupo de planejamento" Then Set wsGrupos = s
  Next

  ' Planilha atual: cabecalho e linhas (para manter as colunas preenchidas a mao)
  nCols = ws.Cells(1, ws.Columns.Count).End(-4159).Column
  nAnt = ws.Cells(ws.Rows.Count, 1).End(-4162).Row
  If nAnt < 2 Then nAnt = 2
  ant = ws.Range(ws.Cells(1, 1), ws.Cells(nAnt, nCols)).Value
  Set cab = CreateObject("Scripting.Dictionary")
  For c = 1 To nCols
    h = Normalizar(ant(1, c))
    If h <> "" And Not cab.Exists(h) Then cab(h) = c
  Next
  If Not cab.Exists("reserva item") Then
    wb.Close False
    Falhar "A planilha base nao tem a coluna 'Reserva item' na primeira linha da primeira aba."
  End If
  Set porChave = CreateObject("Scripting.Dictionary")
  For n = 2 To UBound(ant, 1)
    k = SemZeros(ant(n, cab("reserva item")))
    If k <> "" And Not porChave.Exists(k) Then porChave(k) = n
  Next

  ' Responsaveis por grupo (aba Grupo de Planejamento)
  Set gr = CreateObject("Scripting.Dictionary")
  If Not wsGrupos Is Nothing Then LerGrupos wsGrupos.UsedRange.Value, gr

  ' Colunas da ZPMX0018 por nome
  Set zc = CreateObject("Scripting.Dictionary")
  For c = 1 To UBound(zpm, 2)
    h = Normalizar(zpm(1, c))
    If h <> "" And Not zc.Exists(h) Then zc(h) = c
  Next
  If zc.Exists("norma de apropriacao") Then zc("coletor custo") = zc("norma de apropriacao")
  zc("item") = zItem
  zc("no reserva") = zReserva

  ' Monta as linhas novas
  Dim out, colunas
  colunas = cab.Keys
  ReDim out(UBound(zpm, 1) - 2, nCols - 1)
  For n = 2 To UBound(zpm, 1)
    linha = n - 2
    ac = SemZeros(zpm(n, zReserva)) & SemZeros(zpm(n, zItem))
    mat = SemZeros(zpm(n, zMaterial))
    gpm = ""
    If zGpm > 0 Then gpm = UCase(Trim(zpm(n, zGpm) & ""))
    k = 0
    If porChave.Exists(ac) Then
      k = porChave(ac)
      nManual = nManual + 1
    End If
    For Each h In colunas
      c = cab(h)
      v = Empty
      Select Case h
        Case "reserva item"
          v = Numero(ac)
        Case "material"
          v = Numero(mat)
        Case "ordem", "no reserva", "item"
          If zc.Exists(h) Then v = Numero(SemZeros(zpm(n, zc(h))))
        Case "gerenica", "gerencia"
          If gr.Exists(gpm) Then
            resp = gr(gpm)
            v = resp(0)
          End If
        Case "supervisor"
          If gr.Exists(gpm) Then
            resp = gr(gpm)
            v = resp(1)
          End If
        Case "abastecimento"
          If gr.Exists(gpm) Then
            resp = gr(gpm)
            v = resp(2)
          End If
        Case "texto reserva"
          If textos.Exists(ac) Then
            v = textos(ac)
            nTexto = nTexto + 1
          End If
        Case "mrp"
          If mrps.Exists(mat) Then
            If mrps(mat) <> "" Then
              v = mrps(mat)
              nMrp = nMrp + 1
            End If
          End If
        Case "rc"
          If rcsDe.Exists(ac) Then
            v = Lista(rcsDe(ac))
            nRc = nRc + 1
          End If
        Case "item rc"
          If rcsDe.Exists(ac) Then v = Detalhe(infoRc, rcsDe(ac), ac, mat, True)
        Case "data de solcitacao", "data de solicitacao"
          If rcsDe.Exists(ac) Then v = Detalhe(infoRc, rcsDe(ac), ac, mat, False)
        Case "po"
          If posDe.Exists(ac) Then
            v = Lista(posDe(ac))
            nPo = nPo + 1
          End If
        Case "item po"
          If posDe.Exists(ac) Then v = Detalhe(infoPo, posDe(ac), ac, "", True)
        Case "data remessa"
          If posDe.Exists(ac) Then v = Detalhe(infoPo, posDe(ac), ac, "", False)
        Case Else
          If zc.Exists(h) Then
            v = zpm(n, zc(h))
          ElseIf manuais.Exists(h) Then
            ' Coluna preenchida a mao (Status RC, Status PO, Observacao, Apoio, NOVA DATA...): mantem.
            If k > 0 Then v = ant(k, c)
          Else
            ' Coluna do SAP que o layout da ZPMX0018 nao trouxe: fica vazia (nao repete dado velho).
            faltando(ant(1, c)) = True
          End If
      End Select
      out(linha, c - 1) = v
    Next
  Next

  ' Grava: limpa as linhas antigas e escreve as novas de uma vez
  xl.ScreenUpdating = False
  ws.Range(ws.Cells(2, 1), ws.Cells(nAnt, nCols)).ClearContents
  ws.Range(ws.Cells(2, 1), ws.Cells(UBound(out, 1) + 2, nCols)).Value = out
  On Error Resume Next
  wb.Save
  If Err.Number <> 0 Then
    msg = Err.Description
    wb.Close False
    Falhar "Nao consegui salvar a planilha base: " & msg & vbCrLf & "A copia de antes esta em " & copiaBackup
  End If
  On Error GoTo 0
  wb.Close False
  MontarPlanilhaBase = "Planilha base: " & (UBound(out, 1) + 1) & " linhas | texto reserva " & nTexto & " | MRP " & nMrp & _
    " | RC " & nRc & " | pedido " & nPo & " | anotacoes mantidas em " & nManual & " linhas"
  If faltando.Count > 0 Then MontarPlanilhaBase = MontarPlanilhaBase & vbCrLf & "ATENCAO, colunas que a ZPMX0018 nao trouxe (ficaram vazias): " & Unir(faltando.Keys, ", ")
End Function

' Aba Grupo de Planejamento: GPM -> (gerencia, supervisor, abastecimento). O cabecalho pode se repetir no meio.
Sub LerGrupos(g, gr)
  Dim gl, gc, gGpm, gCab, nm
  gGpm = 0
  Set gCab = CreateObject("Scripting.Dictionary")
  For gl = 1 To UBound(g, 1)
    nm = ""
    If gGpm > 0 Then nm = Normalizar(g(gl, gGpm))
    If gGpm = 0 Or nm = "gpm" Then
      For gc = 1 To UBound(g, 2)
        If Normalizar(g(gl, gc)) = "gpm" Then gGpm = gc
      Next
      If gGpm > 0 Then
        gCab.RemoveAll
        For gc = 1 To UBound(g, 2)
          gCab(Normalizar(g(gl, gc))) = gc
        Next
      End If
    ElseIf nm <> "" Then
      gr(UCase(Trim(g(gl, gGpm)))) = Array(Pegar(g, gl, gCab, Array("gerenica", "gerencia")), Pegar(g, gl, gCab, Array("supervisor")), Pegar(g, gl, gCab, Array("abastecimento")))
    End If
  Next
End Sub

' Varios documentos juntos: "16286102, 16485308"
Function Lista(d)
  Lista = Unir(d.Keys, ", ")
  If d.Count = 1 Then Lista = Numero(Lista)
End Function

' Item ou data de cada RC/pedido da lista, na mesma ordem.
Function Detalhe(info, docs, acomp, mat, querItem)
  Dim partes, d, j, x, chave, achou, par
  ReDim partes(docs.Count - 1)
  j = 0
  achou = False
  For Each d In docs.Keys
    x = ""
    chave = acomp & "|" & d
    If Not info.Exists(chave) And mat <> "" Then chave = mat & "#" & d
    If info.Exists(chave) Then
      par = info(chave)
      If querItem Then x = par(0) Else x = par(1)
      achou = True
    End If
    partes(j) = x
    j = j + 1
  Next
  Detalhe = Empty
  If Not achou Then Exit Function
  Detalhe = Unir(partes, ", ")
  If docs.Count = 1 Then
    If querItem Then
      Detalhe = Numero(Detalhe)
    ElseIf Len(Detalhe) = 10 And InStr(Detalhe, ",") = 0 And Mid(Detalhe, 3, 1) = "/" Then
      Detalhe = DateSerial(CInt(Mid(Detalhe, 7, 4)), CInt(Mid(Detalhe, 4, 2)), CInt(Left(Detalhe, 2)))
    End If
  End If
End Function

' Junta item/data de linhas repetidas (ex.: pedido com varias datas de remessa)
Sub Juntar(info, chave, item, dataTxt)
  Dim a
  If Left(chave, 1) = "|" Or Right(chave, 1) = "|" Or Left(chave, 1) = "#" Or Right(chave, 1) = "#" Then Exit Sub
  If info.Exists(chave) Then
    a = info(chave)
    If InStr(", " & a(0) & ",", ", " & item & ",") = 0 Then a(0) = a(0) & ", " & item
    If dataTxt <> "" And InStr(a(1), dataTxt) = 0 Then
      If a(1) = "" Then a(1) = dataTxt Else a(1) = a(1) & ", " & dataTxt
    End If
    info(chave) = a
  Else
    info(chave) = Array(item, dataTxt)
  End If
End Sub

Sub Acrescentar(d, chave, valor)
  If Not d.Exists(chave) Then d.Add chave, CreateObject("Scripting.Dictionary")
  If Not d(chave).Exists(valor) Then d(chave).Add valor, True
End Sub

Function Pegar(arr, l, cabs, nomes)
  Dim nm
  Pegar = Empty
  For Each nm In nomes
    If cabs.Exists(nm) Then
      Pegar = arr(l, cabs(nm))
      Exit Function
    End If
  Next
End Function


' =====================================================================
'  SAP
' =====================================================================
' Abre a transacao (do zero). Deixa "On Error Resume Next" ligado: quem chama confere com Checar.
Sub Inicio(transacao)
  Dim i
  Registrar transacao
  On Error Resume Next
  ' Fecha janelinhas que tenham sobrado da etapa anterior (elas travam o /n)
  For i = 1 To 5
    If Not Existe("wnd[1]") Then Exit For
    Registrar "Aviso: fechando janela aberta antes da " & transacao & ": " & TextoJanela("wnd[1]")
    session.findById("wnd[1]").close
    Esperar 1
  Next
  session.findById("wnd[0]").maximize
  session.findById("wnd[0]/tbar[0]/okcd").text = "/n" & transacao
  session.findById("wnd[0]").sendVKey 0
  Esperar 2
  If Err.Number <> 0 Then Falhar "Nao consegui abrir a transacao " & transacao & ": " & Err.Description
End Sub

' Espera um campo da tela aparecer (SAP lento). Falha dizendo em que tela parou.
Sub EsperarCampo(id, transacao)
  Dim i
  For i = 1 To 30
    If Existe(id) Then Exit Sub
    Esperar 1
  Next
  Falhar "A tela da " & transacao & " nao abriu como esperado (campo " & id & " nao existe)." & vbCrLf & "Tela atual: " & TelaAtual()
End Sub

' Preenche um campo; se nao existir, diz qual campo e em que tela.
Sub Preencher(id, valor)
  On Error Resume Next
  If Not Existe(id) Then Falhar "Campo nao encontrado: " & id & vbCrLf & "Tela atual: " & TelaAtual()
  If VarType(valor) = vbBoolean Then
    session.findById(id).selected = valor
  Else
    session.findById(id).text = valor
  End If
  If Err.Number <> 0 Then Falhar "Nao consegui preencher " & id & ": " & Err.Description & vbCrLf & "Tela atual: " & TelaAtual()
End Sub

Sub Esperar(segundos)
  Dim i
  WScript.Sleep segundos * 1000
  For i = 1 To 60
    If Not session.Busy Then Exit Sub
    WScript.Sleep 500
  Next
End Sub

Function TextoJanela(id)
  On Error Resume Next
  TextoJanela = session.findById(id).text
  If Existe(id & "/usr/txtMESSTXT1") Then TextoJanela = TextoJanela & " - " & session.findById(id & "/usr/txtMESSTXT1").text
End Function

Function TelaAtual()
  On Error Resume Next
  TelaAtual = session.Info.Transaction & " / " & TextoJanela("wnd[0]") & " | barra: " & session.findById("wnd[0]/sbar").text
  If Existe("wnd[1]") Then TelaAtual = TelaAtual & " | janela aberta: " & TextoJanela("wnd[1]")
End Function

Sub Checar(oque)
  If Err.Number <> 0 Then Falhar "Falha ao " & oque & ": " & Err.Description & vbCrLf & "Tela atual: " & TelaAtual()
  Err.Clear
End Sub

' Executa (F8) e fecha o aviso que as vezes aparece
Sub Executar()
  On Error Resume Next
  session.findById("wnd[0]/tbar[1]/btn[8]").press
  If Existe("wnd[1]/usr/btnBUTTON_1") Then session.findById("wnd[1]/usr/btnBUTTON_1").press
  Err.Clear
End Sub

' Selecao multipla: limpa, cola a lista (area de transferencia) e confirma
Sub ColarLista(botao, valores)
  CopiarTexto Unir(valores, vbCrLf)
  session.findById(botao).press
  If Existe("wnd[1]/tbar[0]/btn[16]") Then session.findById("wnd[1]/tbar[0]/btn[16]").press
  session.findById("wnd[1]/tbar[0]/btn[24]").press
  session.findById("wnd[1]/tbar[0]/btn[8]").press
End Sub

' Janelas do SAP depois de "Planilha": formato (XLSX) e onde salvar.
Sub SalvarComo(pasta, nome)
  If Existe("wnd[1]/usr/cmbG_LISTBOX") Then
    session.findById("wnd[1]/usr/cmbG_LISTBOX").key = FORMATO_XLSX
    session.findById("wnd[1]/tbar[0]/btn[0]").press
  End If
  If Existe("wnd[1]/usr/ctxtDY_PATH") Then
    session.findById("wnd[1]/usr/ctxtDY_PATH").text = pasta
    If Existe("wnd[1]/usr/ctxtDY_FILENAME") Then session.findById("wnd[1]/usr/ctxtDY_FILENAME").text = nome
    ConfirmarSalvar nome
  Else
    Registrar "Aviso: janela de pasta nao apareceu como esperado (" & nome & ")"
  End If
End Sub

' Lista > Exportar > Planilha (menu) e salva em XLSX. False = relatorio sem dados.
Function ExportarPeloMenu(menu, nome)
  Dim caminho, inicioSalvar
  ExportarPeloMenu = False
  caminho = pastaSap & "\" & nome
  Apagar caminho
  inicioSalvar = Now
  On Error Resume Next
  session.findById(menu).select
  If Err.Number <> 0 Then
    Registrar "Aviso: " & nome & " sem dados (" & BarraStatus() & ")"
    Err.Clear
    On Error GoTo 0
    Exit Function
  End If
  SalvarComo pastaSap, nome
  Checar "salvar " & nome
  On Error GoTo 0
  EsperarArquivo caminho, inicioSalvar
  ExportarPeloMenu = True
End Function

' Lista > Salvar > Arquivo local, texto com tabulacao. False = relatorio sem dados.
Function ExportarTexto(nome)
  Dim caminho, inicioSalvar
  ExportarTexto = False
  caminho = pastaSap & "\" & nome
  Apagar caminho
  inicioSalvar = Now
  On Error Resume Next
  session.findById("wnd[0]/tbar[1]/btn[45]").press
  If Err.Number <> 0 Or Not Existe("wnd[1]") Then
    Registrar "Aviso: " & nome & " sem dados (" & BarraStatus() & ")"
    Err.Clear
    On Error GoTo 0
    Exit Function
  End If
  session.findById("wnd[1]/usr/subSUBSCREEN_STEPLOOP:SAPLSPO5:0150/sub:SAPLSPO5:0150/radSPOPLI-SELFLAG[1,0]").select
  session.findById("wnd[1]/tbar[0]/btn[0]").press
  session.findById("wnd[1]/usr/ctxtDY_PATH").text = pastaSap
  session.findById("wnd[1]/usr/ctxtDY_FILENAME").text = nome
  ConfirmarSalvar nome
  Checar "salvar " & nome
  On Error GoTo 0
  EsperarArquivo caminho, inicioSalvar
  ExportarTexto = True
End Function

' Escolhe o layout pelo nome na lista de layouts. Se nao achar, fica no padrao.
Sub EscolherLayout(nome)
  Dim grid, lin, c, col
  On Error Resume Next
  session.findById("wnd[0]/tbar[1]/btn[33]").press
  Set grid = session.findById("wnd[1]/usr/ssubD0500_SUBSCREEN:SAPLSLVC_DIALOG:0501/cntlG51_CONTAINER/shellcont/shell")
  If Err.Number <> 0 Then
    Registrar "Aviso: lista de layouts nao abriu; usando o layout padrao"
    Err.Clear
    Exit Sub
  End If
  For lin = 0 To grid.RowCount - 1
    For c = 0 To grid.ColumnOrder.Count - 1
      col = grid.ColumnOrder(c)
      If UCase(Trim(grid.GetCellValue(lin, col))) = UCase(nome) Then
        grid.currentCellRow = lin
        grid.selectedRows = CStr(lin)
        grid.clickCurrentCell
        Err.Clear
        Exit Sub
      End If
    Next
  Next
  Registrar "Aviso: layout " & nome & " nao encontrado; usando o layout padrao"
  If Existe("wnd[1]") Then session.findById("wnd[1]/tbar[0]/btn[12]").press
  Err.Clear
End Sub

Function BarraStatus()
  On Error Resume Next
  BarraStatus = session.findById("wnd[0]/sbar").Text
  Err.Clear
End Function

Function Existe(id)
  Existe = Not (session.findById(id, False) Is Nothing)
End Function


' =====================================================================
'  Arquivos e Excel
' =====================================================================
Sub CriarPasta(p)
  If Not fso.FolderExists(p) Then fso.CreateFolder p
End Sub

Sub Apagar(caminho)
  On Error Resume Next
  If fso.FileExists(caminho) Then fso.DeleteFile caminho, True
  Err.Clear
  If fso.FileExists(caminho) Then Falhar "Nao consegui apagar o arquivo antigo " & caminho & vbCrLf & _
    "Ele deve estar aberto no Excel. Feche e rode o robo de novo."
End Sub

' Botao "Gerar" da janela de salvar. Se o SAP disser que o arquivo ja existe,
' usa "Substituir"; se a janela continuar aberta, para e diz o motivo.
Sub ConfirmarSalvar(nome)
  On Error Resume Next
  session.findById("wnd[1]/tbar[0]/btn[0]").press
  WScript.Sleep 1000
  If Existe("wnd[1]/usr/ctxtDY_FILENAME") And Existe("wnd[1]/tbar[0]/btn[11]") Then
    session.findById("wnd[1]/tbar[0]/btn[11]").press
    WScript.Sleep 1000
  End If
  If Existe("wnd[1]/usr/ctxtDY_FILENAME") Then
    Falhar "O SAP nao conseguiu salvar " & nome & ": " & session.findById("wnd[0]/sbar").text & vbCrLf & _
      "Feche esse arquivo se estiver aberto no Excel e rode de novo."
  End If
  Err.Clear
End Sub

' Espera ate 10 minutos o arquivo novo ficar completo (tamanho parado).
' Na 1a vez o SAP pergunta "Permitir o acesso a esse file?": clicar Permitir e marcar "Memorizar minha decisao".
Sub EsperarArquivo(caminho, desdeQuando)
  Dim espera, tamanho, anterior
  anterior = -1
  For espera = 1 To 600
    If fso.FileExists(caminho) Then
      If fso.GetFile(caminho).DateLastModified >= DateAdd("s", -5, desdeQuando) Then
        tamanho = fso.GetFile(caminho).Size
        If tamanho > 0 And tamanho = anterior Then Exit Sub
        anterior = tamanho
      End If
    End If
    WScript.Sleep 1000
  Next
  Falhar "O SAP nao salvou " & caminho & "." & vbCrLf & _
    "Se o SAP perguntou 'Permitir o acesso a esse file?', clique Permitir e marque 'Memorizar minha decisao'. Depois rode de novo."
End Sub

Sub AbrirExcel()
  If Not xl Is Nothing Then Exit Sub
  On Error Resume Next
  Set xl = CreateObject("Excel.Application")
  If Err.Number <> 0 Then Falhar "Nao consegui abrir o Excel: " & Err.Description
  On Error GoTo 0
  xl.Visible = False
  xl.DisplayAlerts = False
End Sub

Sub FecharExcel()
  On Error Resume Next
  If Not xl Is Nothing Then xl.Quit
  Set xl = Nothing
  Err.Clear
End Sub

' Le a primeira aba de um .xlsx (numa copia: o SAP pode ter deixado aberto no Excel). Devolve matriz (1..linhas, 1..colunas).
Function LerXlsx(caminho)
  Dim copia, wb, ws, ult, cols
  copia = sh.ExpandEnvironmentStrings("%TEMP%") & "\robo-leitura-" & fso.GetFileName(caminho)
  On Error Resume Next
  fso.CopyFile caminho, copia, True
  If Err.Number <> 0 Then Falhar "Nao consegui copiar " & caminho & ": " & Err.Description
  On Error GoTo 0
  AbrirExcel
  On Error Resume Next
  Set wb = xl.Workbooks.Open(copia, 0, True)
  If Err.Number <> 0 Then Falhar "O Excel nao abriu " & caminho & ": " & Err.Description
  On Error GoTo 0
  Set ws = wb.Worksheets(1)
  ult = ws.UsedRange.Rows.Count + ws.UsedRange.Row - 1
  cols = ws.UsedRange.Columns.Count + ws.UsedRange.Column - 1
  If ult < 2 Then ult = 2
  If cols < 2 Then cols = 2
  LerXlsx = ws.Range(ws.Cells(1, 1), ws.Cells(ult, cols)).Value
  wb.Close False
  On Error Resume Next
  fso.DeleteFile copia, True
  Err.Clear
  On Error GoTo 0
End Function

' Le o texto com tabulacao que o SAP salva. A matriz comeca na linha do cabecalho (a que tem a coluna "chave").
Function LerTexto(caminho, chave)
  Dim f, linhas, li, ini, campos, n, m, lin, c, t
  Set f = fso.OpenTextFile(caminho, 1, False, 0)
  t = ""
  If Not f.AtEndOfStream Then t = f.ReadAll
  f.Close
  linhas = Split(Replace(t, vbCr, ""), vbLf)
  ini = -1
  For li = 0 To UBound(linhas)
    If InStr(linhas(li), vbTab) > 0 Then
      campos = Split(linhas(li), vbTab)
      For c = 0 To UBound(campos)
        If Normalizar(campos(c)) = chave Then ini = li
      Next
    End If
    If ini >= 0 Then Exit For
  Next
  LerTexto = Empty
  If ini < 0 Then Exit Function
  campos = Split(linhas(ini), vbTab)
  m = UBound(campos) + 1
  n = 0
  For li = ini To UBound(linhas)
    If UBound(Split(linhas(li), vbTab)) >= 3 Then n = n + 1
  Next
  Dim arr
  ReDim arr(n, m)
  lin = 0
  For li = ini To UBound(linhas)
    campos = Split(linhas(li), vbTab)
    If UBound(campos) >= 3 Then
      lin = lin + 1
      For c = 0 To UBound(campos)
        If c < m Then arr(lin, c + 1) = Trim(campos(c))
      Next
    End If
  Next
  LerTexto = arr
End Function

' Indice da coluna (linha 1 da matriz) pelo nome; obrigatoria = para o robo se nao achar.
Function Coluna(arr, nomes, obrigatoria)
  Dim nm, c
  Coluna = 0
  If Not IsArray(arr) Then
    If obrigatoria Then Falhar "Relatorio vazio ou diferente do esperado (procurei a coluna '" & nomes(0) & "')."
    Exit Function
  End If
  For Each nm In nomes
    For c = 1 To UBound(arr, 2)
      If Normalizar(arr(1, c)) = nm Then
        Coluna = c
        Exit Function
      End If
    Next
  Next
  If obrigatoria Then Falhar "Nao achei a coluna '" & nomes(0) & "' no relatorio. O layout mudou?"
End Function

' Valores da coluna, sem repetir (sem zeros na frente quando pedido)
Function ValoresUnicos(arr, col, tirarZeros)
  Dim d, lin, v
  Set d = CreateObject("Scripting.Dictionary")
  For lin = 2 To UBound(arr, 1)
    If tirarZeros Then v = SemZeros(arr(lin, col)) Else v = Trim(CStr(arr(lin, col) & ""))
    If v <> "" And Not d.Exists(v) Then d.Add v, True
  Next
  If d.Count = 0 Then Falhar "Nenhum valor encontrado para colar no SAP."
  ValoresUnicos = d.Keys
End Function

' No de acompanhamento = reserva + item (sem zeros na frente), so dos itens nao eliminados
Function Acompanhamentos(arr, cRes, cItem, cElim, cStatus)
  Dim d, lin, v, eliminado
  Set d = CreateObject("Scripting.Dictionary")
  For lin = 2 To UBound(arr, 1)
    eliminado = False
    If cElim > 0 Then eliminado = (UCase(Trim(arr(lin, cElim) & "")) = "X" Or arr(lin, cElim) = True)
    If cStatus > 0 Then eliminado = eliminado Or (UCase(Trim(arr(lin, cStatus) & "")) = "ELIMINADO")
    v = SemZeros(arr(lin, cRes)) & SemZeros(arr(lin, cItem))
    If Not eliminado And v <> "" And Not d.Exists(v) Then d.Add v, True
  Next
  If d.Count = 0 Then Falhar "Nenhuma reserva/item encontrada na ZPMX0018."
  Acompanhamentos = d.Keys
End Function

' Junta os itens de uma lista com o separador (igual ao Join).
Function Unir(lista, separador)
  Dim item, primeiro
  Unir = ""
  primeiro = True
  For Each item In lista
    If primeiro Then Unir = item Else Unir = Unir & separador & item
    primeiro = False
  Next
End Function

Function SemZeros(valor)
  Dim v
  ' O SAP as vezes poe um espaco "nao separavel" (ChrW 160) na frente do numero.
  v = Trim(Replace(CStr(valor & ""), ChrW(160), " "))
  Do While Len(v) > 1 And Left(v, 1) = "0"
    v = Mid(v, 2)
  Loop
  SemZeros = v
End Function

' Numero quando so tem digitos (como na planilha base); senao o texto.
Function Numero(v)
  Numero = v
  If VarType(v) = vbString Then
    If v <> "" And Len(v) <= 15 And Not SoDigitosFalso(v) Then Numero = CDbl(v)
  End If
End Function

Function SoDigitosFalso(v)
  Dim p
  SoDigitosFalso = False
  For p = 1 To Len(v)
    If InStr("0123456789", Mid(v, p, 1)) = 0 Then
      SoDigitosFalso = True
      Exit Function
    End If
  Next
End Function

' Data do SAP "22.10.2027" -> "22/10/2027"
Function DataTexto(v)
  DataTexto = Replace(Trim(CStr(v & "")), ".", "/")
End Function

Function Dois(n)
  Dois = Right("0" & n, 2)
End Function

' minusculas, sem acento, espacos simples; "No" com o/a ordinal -> "no", "1a" -> "1a"
Function Normalizar(v)
  Dim s, de, para, p
  s = LCase(Trim(Replace(CStr(v & ""), ChrW(160), " ")))
  de = Array(&HE1, &HE0, &HE2, &HE3, &HE4, &HE9, &HE8, &HEA, &HED, &HEC, &HF3, &HF2, &HF4, &HF5, &HFA, &HF9, &HFC, &HE7, &HBA, &HB0, &HAA)
  para = Array("a", "a", "a", "a", "a", "e", "e", "e", "i", "i", "o", "o", "o", "o", "u", "u", "u", "c", "o", "o", "a")
  For p = 0 To UBound(de)
    s = Replace(s, ChrW(de(p)), para(p))
  Next
  Do While InStr(s, "  ") > 0
    s = Replace(s, "  ", " ")
  Loop
  Normalizar = s
End Function

' Coloca o texto na area de transferencia do Windows (clip.exe).
Sub CopiarTexto(texto)
  Dim tmp, f
  tmp = sh.ExpandEnvironmentStrings("%TEMP%") & "\robo-ordens.txt"
  Set f = fso.CreateTextFile(tmp, True, False)
  f.Write texto & vbCrLf
  f.Close
  sh.Run "cmd /c clip < """ & tmp & """", 0, True
End Sub

Sub Registrar(msg)
  Dim f
  Set f = fso.OpenTextFile(historico, 8, True)
  f.WriteLine Now & "  " & msg
  f.Close
End Sub

Sub Falhar(msg)
  Registrar "ERRO: " & msg
  FecharExcel
  If Not silencioso Then MsgBox msg, vbCritical, "Robo ORDENS"
  WScript.Quit 1
End Sub


' =====================================================================
'  Envio para o app (em partes, pela conexao do Windows)
' =====================================================================
Function EnviarPlanilha(caminho, nome)
  Dim copia, todo, total, envio, parte, bytes, status, texto, erro
  copia = sh.ExpandEnvironmentStrings("%TEMP%") & "\robo-envio.tmp"
  On Error Resume Next
  fso.CopyFile caminho, copia, True
  If Err.Number <> 0 Then Falhar "Nao consegui copiar a planilha para enviar (feche o Excel): " & Err.Description
  Set todo = CreateObject("ADODB.Stream")
  todo.Type = 1
  todo.Open
  todo.LoadFromFile copia
  If Err.Number <> 0 Or todo.Size = 0 Then Falhar "Nao consegui ler a planilha para enviar: " & Err.Description
  On Error GoTo 0
  total = Int((todo.Size - 1) / PARTE_BYTES) + 1
  Randomize
  envio = "r" & Year(Now) & Dois(Month(Now)) & Dois(Day(Now)) & "-" & Int(Rnd * 1000000000)
  For parte = 1 To total
    todo.Position = (parte - 1) * PARTE_BYTES
    bytes = todo.Read(PARTE_BYTES)
    EnviarParte bytes, envio, parte, total, nome, status, texto, erro
    If parte < total Then
      If status <> 202 Then Falhar "A planilha base foi salva, mas o envio de " & nome & " para o app falhou (parte " & parte & " de " & total & ")." & vbCrLf & vbCrLf & erro & vbCrLf & texto
    ElseIf status <> 200 Then
      Falhar "A planilha base foi salva, mas o envio de " & nome & " para o app falhou." & vbCrLf & vbCrLf & erro & vbCrLf & texto & vbCrLf & vbCrLf & _
        "Teste: abra " & URL_APP & " no navegador deste PC."
    End If
  Next
  todo.Close
  fso.DeleteFile copia, True
  EnviarPlanilha = texto
End Function

Sub EnviarParte(bytes, envio, parte, total, nome, ByRef status, ByRef texto, ByRef erro)
  Dim limite, corpo, http
  status = 0 : texto = "" : erro = ""
  On Error Resume Next
  limite = "----RoboOrdens" & envio & "p" & parte
  Set corpo = CreateObject("ADODB.Stream")
  corpo.Type = 1
  corpo.Open
  EscreverTexto corpo, Campo(limite, "envio", envio) & Campo(limite, "parte", parte) & Campo(limite, "total", total) & _
    "--" & limite & vbCrLf & _
    "Content-Disposition: form-data; name=""arquivo""; filename=""" & nome & """" & vbCrLf & _
    "Content-Type: application/octet-stream" & vbCrLf & vbCrLf
  corpo.Write bytes
  EscreverTexto corpo, vbCrLf & "--" & limite & "--" & vbCrLf
  corpo.Position = 0
  Set http = CreateObject("MSXML2.XMLHTTP.6.0")
  If Err.Number <> 0 Then
    Err.Clear
    Set http = CreateObject("MSXML2.XMLHTTP")
  End If
  http.open "POST", URL_APP & "/api/robo/importar", False
  http.setRequestHeader "Authorization", "Bearer " & TOKEN
  http.setRequestHeader "Content-Type", "multipart/form-data; boundary=" & limite
  http.send corpo.Read
  corpo.Close
  If Err.Number <> 0 Then
    erro = "erro " & Hex(Err.Number) & " " & Err.Description
    Err.Clear
    Exit Sub
  End If
  status = http.status
  texto = http.responseText
  If status <> 200 And status <> 202 Then erro = "HTTP " & status
End Sub

Function Campo(limite, nome, valor)
  Campo = "--" & limite & vbCrLf & "Content-Disposition: form-data; name=""" & nome & """" & vbCrLf & vbCrLf & valor & vbCrLf
End Function

Sub EscreverTexto(destino, textoAscii)
  Dim t
  Set t = CreateObject("ADODB.Stream")
  t.Type = 2
  t.Charset = "us-ascii"
  t.Open
  t.WriteText textoAscii
  t.Position = 0
  t.Type = 1
  destino.Write t.Read
  t.Close
End Sub
