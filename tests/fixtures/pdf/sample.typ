// Rebuild with: typst compile --input pages=10 sample.typ "mathematical model.PDF"
// Use pages=1 for one-page.pdf and pages=40 for long-paper.pdf.
#set document(title: "Mathematical model - PDF viewer fixture", author: "Site tests")
#set text(size: 11pt)
#let total = int(sys.inputs.at("pages", default: "10"))
#for n in range(1, total + 1) {
  set page(width: if n == 3 { 792pt } else { 612pt }, height: if n == 3 { 612pt } else if n == 4 { 612pt } else { 792pt }, margin: 48pt, footer: align(center)[#n / #total])
  [= Mathematical model
  Page #n - vector mathematics and selectable text.

  This small fixture checks faithful typesetting, page order, and reading flow.
  Each page contains text and vector diagrams, without image-based equations.

  == A variational model
  Let $u in H_0^1(Omega)$ minimize the following functional:

  $ cal(E)[u] = integral_Omega (frac(1, 2) norm(nabla u)^2 + frac(lambda, 4) u^4 - f u) dif x. $

  For a test function $v$, the first variation satisfies

  $ frac(d, d epsilon) cal(E)[u + epsilon v] |_(epsilon = 0)
    = integral_Omega (nabla u dot nabla v + lambda u^3 v - f v) dif x = 0. $

  The corresponding spectral approximation uses

  $ u_N(x) = sum_(k=1)^N a_k phi_k(x), quad
    bold(A) = mat(2, -1, 0; -1, 2, -1; 0, -1, 2). $

  == A vector diagram
  #align(center)[
    #box(stroke: 0.8pt, inset: 10pt)[$u$]
    #h(12pt) $arrow.r$ #h(12pt)
    #box(stroke: 0.8pt, inset: 10pt)[$nabla u$]
    #h(12pt) $arrow.r$ #h(12pt)
    #box(stroke: 0.8pt, inset: 10pt)[$cal(E)[u]$]
  ]

  The original PDF retains its fonts, margins, equations, and vector paths.
  ]
  if n < total { pagebreak() }
}
