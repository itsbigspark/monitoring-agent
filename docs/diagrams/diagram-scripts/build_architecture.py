#!/usr/bin/env python3
"""Sentinel system-architecture diagram (SVG). Square canvas so macOS qlmanage
renders the full width without clipping."""

NAVY="#0F2A47"; TEAL="#189AB4"; SLATE="#333F4A"; LIGHT="#F2F5F7"
WHITE="#FFFFFF"; MUTED="#6B7780"; HL="#E4F3F6"; BORDER="#C8D4DE"
GREEN="#2E8B6F"; GREENBG="#EAF7F1"

W = H = 1480
out=[]
def add(s): out.append(s)

def esc(s): return str(s).replace("&","&amp;").replace("<","&lt;").replace(">","&gt;")

def box(x,y,w,h,fill=LIGHT,stroke=BORDER,rx=10,sw=1.5,dash=None):
    d=f' stroke-dasharray="{dash}"' if dash else ""
    add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" ry="{rx}" '
        f'fill="{fill}" stroke="{stroke}" stroke-width="{sw}"{d}/>')

def text(x,y,s,size=15,color=SLATE,bold=False,anchor="middle"):
    fw="700" if bold else "400"
    add(f'<text x="{x}" y="{y}" font-family="Calibri,Segoe UI,Arial" font-size="{size}" '
        f'font-weight="{fw}" fill="{color}" text-anchor="{anchor}">{esc(s)}</text>')

def mtext(cx,cy,lines,size=15,color=SLATE,subcolor=None,bold=True,lh=None):
    lh=lh or size+5; subcolor=subcolor or color
    y0=cy-(len(lines)-1)*lh/2+size*0.35
    for i,ln in enumerate(lines):
        text(cx,y0+i*lh,ln,size=size if i==0 else size-1.5,
             color=color if i==0 else subcolor,bold=bold and i==0)

def card(cx,cy,w,h,lines,fill=WHITE,stroke=TEAL,size=14,color=NAVY,sub=MUTED,sw=1.6):
    box(cx-w/2,cy-h/2,w,h,fill=fill,stroke=stroke,rx=9,sw=sw)
    mtext(cx,cy,lines,size=size,color=color,subcolor=sub)

def arrow(x1,y1,x2,y2,color=SLATE,sw=2.2,both=False):
    ms=' marker-start="url(#arrowr)"' if both else ""
    add(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" '
        f'stroke-width="{sw}" marker-end="url(#arrow)"{ms}/>')

add(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" '
    f'font-family="Calibri,Segoe UI,Arial">')
add('<defs>')
add(f'<marker id="arrow" markerWidth="11" markerHeight="11" refX="9" refY="5" orient="auto" '
    f'markerUnits="userSpaceOnUse"><path d="M0,0 L10,5 L0,10 z" fill="{SLATE}"/></marker>')
add(f'<marker id="arrowr" markerWidth="11" markerHeight="11" refX="1" refY="5" orient="auto" '
    f'markerUnits="userSpaceOnUse"><path d="M10,0 L0,5 L10,10 z" fill="{SLATE}"/></marker>')
add('</defs>')
add(f'<rect width="{W}" height="{H}" fill="{WHITE}"/>')

# title
text(W/2,46,"Sentinel — Proposed System Architecture",size=27,color=NAVY,bold=True)
text(W/2,74,"Deployed fully within the client environment · one isolated instance per client",
     size=15,color=MUTED)

# outer client boundary
box(30,100,W-60,1000,fill="#FBFDFE",stroke=TEAL,rx=16,sw=2.5,dash="10 7")
text(52,128,"CLIENT ENVIRONMENT — all logs, code, data & LLM inference stay inside this boundary",
     size=14,color=TEAL,bold=True,anchor="start")

# ServiceNow (left)
card(150,640,180,100,["ServiceNow","incident queue"],fill=HL,stroke=NAVY,size=15,color=NAVY,sw=2)

# ---- Sentinel box ----
SX,SY,SW_,SH=300,165,820,765
box(SX,SY,SW_,SH,fill=WHITE,stroke=NAVY,rx=14,sw=2.5)
text(SX+18,SY+30,"SENTINEL",size=16,color=NAVY,bold=True,anchor="start")
text(SX+SW_-16,SY+30,"LangGraph · MCP-first · model-agnostic",size=12.5,color=MUTED,anchor="end")

# top row: ingestion, triage
card(430,258,200,62,["Ingestion & filter"],fill=LIGHT,stroke=TEAL,size=14)
card(660,258,200,62,["Triage / Router","in scope?"],fill=LIGHT,stroke=TEAL,size=13)

# investigation graph
GX,GY,GW,GH=325,335,520,205
box(GX,GY,GW,GH,fill="#F7FAFB",stroke=BORDER,rx=12)
add(f'<path d="M{GX+12},{GY} h{GW-24} a12,12 0 0 1 12,12 v22 h{-GW} v-22 a12,12 0 0 1 12,-12 z" fill="{NAVY}"/>')
text(GX+GW/2,GY+23,"Investigation graph (LangGraph)",size=15,color=WHITE,bold=True)
nodes=["Plan","Gather","Correlate","Root\ncause","Propose\nfix"]
nw=90; ncy=GY+128; ng=(GW-len(nodes)*nw)/(len(nodes)+1)
prev=None
for i,nm in enumerate(nodes):
    cx=GX+ng*(i+1)+nw*i+nw/2
    box(cx-nw/2,ncy-32,nw,64,fill=WHITE,stroke=TEAL,rx=8,sw=1.6)
    mtext(cx,ncy,nm.split("\n"),size=12.5,color=NAVY)
    if prev is not None: arrow(prev+nw/2,ncy,cx-nw/2,ncy,color=TEAL,sw=1.7)
    prev=cx
PROPOSE_X=prev

# MCP layer
MX,MY,MW,MH=325,592,520,56
box(MX,MY,MW,MH,fill=NAVY,rx=10)
text(MX+MW/2,MY+MH/2+5,"Tool / MCP layer",size=15,color=WHITE,bold=True)
text(MX+MW/2,MY+MH-9,"langchain-mcp-adapters · direct APIs",size=11,color="#9FB6C9")

# right column
RCX=998
card(RCX,258,224,80,["Model-agnostic LLM","Bedrock · self-hosted · local"],fill=HL,stroke=NAVY,size=13)
card(RCX,412,224,82,["Isolated playground","reproduce & validate fix"],fill=GREENBG,stroke=GREEN,size=13,sub=GREEN)
card(RCX,556,224,72,["State store / audit","Postgres · full audit trail"],fill=LIGHT,stroke=BORDER,size=13,color=SLATE)
card(RCX,700,224,86,["Findings + HITL approval","root cause · fix or synopsis"],fill=HL,stroke=NAVY,size=13)

# ---- data sources ----
text(52,945,"CLIENT DATA SOURCES & SYSTEMS — read-only access via MCP",
     size=13.5,color=MUTED,bold=True,anchor="start")
srcs=[("Splunk","logs"),("Code repo","+ Intent Layer"),("Database","read-only"),
      ("Snowflake","data"),("S3","objects")]
dsw=92; dgap=15; dy=1000
startx=GX; step=dsw+dgap
xs=[]
for i,(a,b) in enumerate(srcs):
    cx=startx+i*step+dsw/2; xs.append(cx)
    card(cx,dy,dsw,86,[a,b],fill=WHITE,stroke=TEAL,size=12.5,color=NAVY)
text(xs[-1]+step,dy,"…",size=22,color=MUTED)

# ---- outputs ----
OCX=1300
text(OCX,212,"OUTPUTS",size=13,color=MUTED,bold=True)
outs=[("Update ServiceNow ticket",HL,NAVY,NAVY),
      ("Open pull request (review)",HL,NAVY,NAVY),
      ("Notify dev team (Teams/Slack)",HL,NAVY,NAVY),
      ("Dev team — human review",WHITE,GREEN,GREEN)]
oy0=270; ostep=92
for i,(lbl,fl,st,tc) in enumerate(outs):
    card(OCX,oy0+i*ostep,250,66,[lbl],fill=fl,stroke=st,size=13,color=tc)

# =================== connections ===================
arrow(238,600,SX+30,272,color=SLATE)                 # SN -> ingestion
text(250,500,"webhook /",size=11.5,color=MUTED,anchor="start")
text(250,517,"poller · filter",size=11.5,color=MUTED,anchor="start")
arrow(530,258,560,258,color=SLATE)                   # ingestion -> triage
arrow(660,289,660,GY,color=SLATE)                    # triage -> graph
arrow(GX+GW/2,GY+GH,GX+GW/2,MY,color=SLATE,both=True) # graph <-> MCP
arrow(GX+GW,GY+40,RCX-112,266,color=NAVY,sw=2,both=True)   # graph <-> LLM
arrow(GX+GW,412,RCX-112,412,color=GREEN,sw=2,both=True)    # graph <-> playground
arrow(GX+GW,GY+150,RCX-112,556,color=MUTED,sw=1.8)         # graph -> state
arrow(GX+GW,GY+170,RCX-112,690,color=SLATE,sw=1.9)         # graph -> findings
for cx in xs:                                              # MCP <-> sources
    arrow(cx,dy-43,cx,MY+MH,color=MUTED,sw=1.6,both=True)
for i in range(3):                                         # findings -> outputs
    arrow(RCX+112 if False else SX+SW_,700,OCX-125,oy0+i*ostep,color=SLATE,sw=1.6)
arrow(OCX,oy0+2*ostep+33,OCX,oy0+3*ostep-33,color=GREEN,sw=1.8)  # notify -> devteam

# ---- legend ----
ly=1065
add(f'<line x1="60" y1="{ly}" x2="100" y2="{ly}" stroke="{TEAL}" stroke-width="2.5" stroke-dasharray="8 5"/>')
text(110,ly+4,"trust / data boundary (in-client)",size=12.5,color=MUTED,anchor="start")
box(430,ly-9,18,18,fill=GREENBG,stroke=GREEN,rx=4,sw=1.5)
text(456,ly+4,"sandbox & human-in-the-loop",size=12.5,color=MUTED,anchor="start")
add(f'<line x1="760" y1="{ly}" x2="800" y2="{ly}" stroke="{NAVY}" stroke-width="2" '
    f'marker-end="url(#arrow)" marker-start="url(#arrowr)"/>')
text(810,ly+4,"bidirectional (query / response)",size=12.5,color=MUTED,anchor="start")

add('</svg>')
path="/Users/zein/monitoring-agent/docs/sentinel-architecture.svg"
open(path,"w").write("\n".join(out))
print("saved",path)
