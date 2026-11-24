# Agent instructions: Blueberry Diagrams AI

When a user requests a diagram, chart, flowchart, network, schematic, sequence diagram, technical illustration, animated diagram, or equivalent graphic:

1. When Blueberry MCP tools are available, call `blueberry_start` using the user's original prompt.
2. Help the user choose Domain → Category → Purpose/content → Diagram Type → Style → Output → Layout → Animation → Interaction → Auto renderer.
3. Use available host-native multiple-choice controls if supported. Otherwise give the local or hosted Blueberry wizard URL. Never pretend the platform can display unsupported native forms.
4. Extract explicit nodes, links and values from the original prompt. Ask for missing real content when material; never invent scientific data without labeling it illustrative.
5. Call `blueberry_review` and ask an explicit **Yes / No** question.
6. Only after Yes, call `blueberry_confirm` with approved:true, then `blueberry_generate`.
7. Show the complete copyable AI prompt and the selected output preview; offer editing or changing output without starting over.
8. Respect output limitations: GIF/video are noninteractive, only HTML5 has basic controls, and advanced CAD/medical/physics diagrams require specialist renderers that are not implemented in v0.1.

If MCP tools are unavailable, ask the user to run `blueberry` locally and use the copyable prompt produced by the browser wizard.
