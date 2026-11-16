---
status: demostracion
language: en
caseId: flujo-editorial-hotel-mirador
slug: hotel-mirador-arrivals
origin: sintetico
title: "An arrival process shared across front desk shifts"
summary: "Hotel Mirador records the status of each arrival so the front desk team can maintain service during handover."
client: Hotel Mirador
breadcrumbLabel: Hotel Mirador
category: "Digital check-in"
topics:
  - Front desk handover
  - Handling exceptions
  - Document verification
cover:
  file: mirador-recepcion-1440.webp
  alt: "Stone reception area with a wooden desk and views of a hillside at sunset"
  width: 1440
  height: 960
  focal: derecha
  small:
    file: mirador-recepcion-768.webp
    width: 768
    height: 512
related:
  - hotel-bruma-turnos
blocks:
  - type: video
    video:
      provider: local
      title: "Recording an arrival"
      audio: con-audio
      sources:
        - modular-llegada.mp4
      poster:
        file: modular-llegada-poster.webp
        alt: "Screen displaying the Spanish words «Llegada registrada» (Arrival recorded)"
        width: 640
        height: 360
      caption: "Registration sequence with English captions."
      captions:
        - file: modular-llegada-en.vtt
          lang: en
          label: "English"
      transcript: "The screen displays «Llegada registrada» (Arrival recorded) and a line moves forward. A brief tone plays. There is no dialogue."
  - type: texto
  - type: imagen
    variant: destacada
    image:
      file: modular-mostrador-ilustrativo.webp
      alt: "Tablet on a wooden counter next to a lamp"
      width: 500
      height: 296
      focal: izquierda
  - type: comparacion
    title: "How the handover changed"
    comparison:
      before:
        - The team consulted notes from several bookings.
      after:
        - The status and outstanding action are displayed together.
  - type: texto
    file: comprobacion
  - type: video
    video:
      provider: local
      title: "Confirming a shift handover"
      audio: sin-audio
      sources:
        - modular-relevo.webm
      poster:
        file: modular-relevo-poster.webp
        alt: "Screen displaying the Spanish words «Relevo confirmado» (Handover confirmed)"
        width: 640
        height: 360
      transcript: "The screen displays «Relevo confirmado» (Handover confirmed) while a line moves forward. The video is silent."
  - type: testimonio
    quote:
      text: "The handover note let us resume the booking with a clear next step."
      author: "Front desk team"
      role: "Shift supervisor"
  - type: resultados
    results:
      - type: cualitativo
        description: "The record distinguishes arrivals that need help."
  - type: galeria
    title: "Around the property"
    variant: destacada
    images:
      - file: mirador-pasillo-500.webp
        alt: "Stone-arched passage with potted plants in the afternoon light"
        caption: "Passage leading to the common areas."
        width: 500
        height: 296
      - file: modular-jardin-ilustrativo.webp
        alt: "Stone bench among aromatic plants"
        caption: "Outdoor seating area."
        width: 500
        height: 296
      - file: mirador-puesto-500.webp
        alt: "Laptop on a wooden table next to a lamp"
        caption: "Workstation where incoming staff check the handover note."
        width: 500
        height: 296
---

## How registration starts

The front desk checks the document and records whether the incoming team needs to complete any outstanding checks.

The record covers routine arrivals and guests who need assistance.
