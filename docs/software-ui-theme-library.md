# Software UI Theme Library

A Codex-ready design specification containing coordinated light and dark palettes for software interfaces.

## Implementation principles

- Use semantic tokens rather than assigning raw hex values directly to components.
- Do not invert colors mechanically between light and dark modes.
- Keep dark-mode backgrounds near-black rather than pure black.
- Use off-white primary text in dark mode rather than `#FFFFFF`.
- Reserve warning, error, and success colors for status communication.
- Use the accent token sparingly for highlights, key metrics, badges, and visualization emphasis.
- Validate text and interactive states against WCAG contrast requirements before production use.

## Canonical token names

```css
--ui-background
--ui-surface
--ui-surface-elevated
--ui-primary
--ui-secondary
--ui-accent
--ui-text-primary
--ui-text-secondary
--ui-border
--ui-success
--ui-warning
--ui-error
```

## Theme index

1. [Obsidian Terminal](#obsidian-terminal) — Technical / Developer
2. [Editorial Finance](#editorial-finance) — Finance / Institutional
3. [Aerospace Command](#aerospace-command) — Defense / Operations
4. [Modern Apothecary](#modern-apothecary) — Healthcare / Wellness
5. [Copper Industrial](#copper-industrial) — Industrial / Manufacturing
6. [Neo-Swiss](#neo-swiss) — Minimal / Enterprise
7. [Deep Ocean Intelligence](#deep-ocean-intelligence) — AI / Research
8. [Midnight Burgundy](#midnight-burgundy) — Premium / Executive
9. [Cotton Candy](#cotton-candy) — Lifestyle / Playful
10. [Boba Tea](#boba-tea) — Lifestyle / Food
11. [Red Panda](#red-panda) — Nature / Playful
12. [Japanese Cherry Blossom](#japanese-cherry-blossom) — Culture / Wellness
13. [Paris](#paris) — City / Editorial
14. [London](#london) — City / Enterprise
15. [Seoul](#seoul) — City / Technology
16. [Los Angeles](#los-angeles) — City / Creative
17. [New York City](#new-york-city) — City / Finance
18. [Scuderia Red](#scuderia-red) — F1 Team Inspired
19. [Silver Arrow](#silver-arrow) — F1 Team Inspired
20. [Papaya Racing](#papaya-racing) — F1 Team Inspired
21. [Midnight Bull](#midnight-bull) — F1 Team Inspired
22. [British Racing Green](#british-racing-green) — F1 Team Inspired
23. [Alpine Tricolor](#alpine-tricolor) — F1 Team Inspired
24. [Monaco Night](#monaco-night) — F1 Track Inspired
25. [Suzuka Sakura](#suzuka-sakura) — F1 Track Inspired
26. [Spa Ardennes](#spa-ardennes) — F1 Track Inspired
27. [Singapore Night Race](#singapore-night-race) — F1 Track Inspired
28. [Monza Rosso](#monza-rosso) — F1 Track Inspired

## 1. Obsidian Terminal

**Category:** Technical / Developer

A technical interface for AI tools, developer products, cybersecurity, and analytics.

| UI role          | Light mode | Dark mode |
| ---------------- | ---------: | --------: |
| Background       |  `#F1F4F6` | `#0A0F14` |
| Surface          |  `#FFFFFF` | `#141B23` |
| Elevated surface |  `#E8EDF1` | `#1D2732` |
| Primary          |  `#087A5A` | `#42E6B1` |
| Secondary        |  `#276FAD` | `#65AFFF` |
| Accent           |  `#7653A6` | `#B49AE8` |
| Main text        |  `#17212A` | `#E8EEF3` |
| Muted text       |  `#687681` | `#8F9CA7` |
| Border           |  `#CFD7DD` | `#303C48` |
| Success          |  `#247A51` | `#56CF8B` |
| Warning          |  `#A96A16` | `#F2CC60` |
| Error            |  `#B33C50` | `#FF6C83` |

## 2. Editorial Finance

**Category:** Finance / Institutional

A refined publication-style theme for investment research, private equity, and institutional reporting.

| UI role          | Light mode | Dark mode |
| ---------------- | ---------: | --------: |
| Background       |  `#F4F0E7` | `#12171E` |
| Surface          |  `#FFFCF6` | `#1A212B` |
| Elevated surface |  `#FFFFFF` | `#222B37` |
| Primary          |  `#17365D` | `#79A9E0` |
| Secondary        |  `#7D2636` | `#D98091` |
| Accent           |  `#B98224` | `#E4B85E` |
| Main text        |  `#211F1B` | `#F0F3F6` |
| Muted text       |  `#6F6A61` | `#9DA8B5` |
| Border           |  `#D7CFC1` | `#35404D` |
| Success          |  `#39724A` | `#69C483` |
| Warning          |  `#9C6712` | `#E4B85E` |
| Error            |  `#A43B3B` | `#F07878` |

## 3. Aerospace Command

**Category:** Defense / Operations

A command-center aesthetic inspired by aircraft displays, aerospace systems, and operational dashboards.

| UI role          | Light mode | Dark mode |
| ---------------- | ---------: | --------: |
| Background       |  `#EEF4F7` | `#06131E` |
| Surface          |  `#FFFFFF` | `#0C2232` |
| Elevated surface |  `#E2EDF2` | `#143247` |
| Primary          |  `#00758C` | `#35C7DF` |
| Secondary        |  `#1D5273` | `#74AEDA` |
| Accent           |  `#A86800` | `#FFBD3D` |
| Main text        |  `#142631` | `#ECF7FA` |
| Muted text       |  `#637985` | `#8FAABA` |
| Border           |  `#C5D6DE` | `#285066` |
| Success          |  `#307A55` | `#62D293` |
| Warning          |  `#A86800` | `#FFBD3D` |
| Error            |  `#B83333` | `#FF6969` |

## 4. Modern Apothecary

**Category:** Healthcare / Wellness

A calm healthcare theme using sage, terracotta, and restrained neutral tones.

| UI role          | Light mode | Dark mode |
| ---------------- | ---------: | --------: |
| Background       |  `#F1F4F0` | `#111917` |
| Surface          |  `#FFFFFF` | `#1A2522` |
| Elevated surface |  `#E7ECE8` | `#24312D` |
| Primary          |  `#315F55` | `#78B5A5` |
| Secondary        |  `#6F8E81` | `#9CC3B5` |
| Accent           |  `#B96845` | `#E59A77` |
| Main text        |  `#22322D` | `#EEF4F1` |
| Muted text       |  `#687972` | `#9CAEA7` |
| Border           |  `#D2DDD7` | `#394A44` |
| Success          |  `#397858` | `#70C395` |
| Warning          |  `#A76A32` | `#E1B15E` |
| Error            |  `#AD4E4A` | `#E77C77` |

## 5. Copper Industrial

**Category:** Industrial / Manufacturing

An industrial operating-system theme combining steel gray, copper, and deep blue.

| UI role          | Light mode | Dark mode |
| ---------------- | ---------: | --------: |
| Background       |  `#F1F3F4` | `#10171E` |
| Surface          |  `#FFFFFF` | `#19232D` |
| Elevated surface |  `#E8ECEF` | `#24313D` |
| Primary          |  `#A94F1C` | `#E38A4E` |
| Secondary        |  `#316C87` | `#68A9C5` |
| Accent           |  `#BF7A24` | `#F0B45C` |
| Main text        |  `#1E272E` | `#EEF2F5` |
| Muted text       |  `#64717A` | `#9EABB5` |
| Border           |  `#CED5DA` | `#3B4854` |
| Success          |  `#3F7851` | `#73BA88` |
| Warning          |  `#A66F16` | `#E6B450` |
| Error            |  `#A84035` | `#EC776D` |

## 6. Neo-Swiss

**Category:** Minimal / Enterprise

A structured interface inspired by Swiss graphic design, strong grids, and modern enterprise software.

| UI role          | Light mode | Dark mode |
| ---------------- | ---------: | --------: |
| Background       |  `#F7F7F5` | `#111214` |
| Surface          |  `#FFFFFF` | `#1A1C1F` |
| Elevated surface |  `#ECECEA` | `#24272B` |
| Primary          |  `#C9342D` | `#FF6A61` |
| Secondary        |  `#1D3557` | `#7FA6D6` |
| Accent           |  `#B98219` | `#E5B34E` |
| Main text        |  `#111111` | `#F3F3F1` |
| Muted text       |  `#6D6D6B` | `#A3A5A8` |
| Border           |  `#D7D7D4` | `#393D42` |
| Success          |  `#2A7A52` | `#65C08C` |
| Warning          |  `#A66C13` | `#E5B34E` |
| Error            |  `#B73732` | `#F07872` |

## 7. Deep Ocean Intelligence

**Category:** AI / Research

A sophisticated blue-green theme for AI platforms, research systems, and data-heavy dashboards.

| UI role          | Light mode | Dark mode |
| ---------------- | ---------: | --------: |
| Background       |  `#EEF5F6` | `#061923` |
| Surface          |  `#FFFFFF` | `#0B2633` |
| Elevated surface |  `#E2ECEF` | `#123746` |
| Primary          |  `#087F73` | `#22C7A9` |
| Secondary        |  `#2E78B7` | `#4D9DE0` |
| Accent           |  `#A77D20` | `#D9B44A` |
| Main text        |  `#183039` | `#EAF4F6` |
| Muted text       |  `#647B83` | `#86A6AF` |
| Border           |  `#C9D9DE` | `#24505D` |
| Success          |  `#317A62` | `#66C59B` |
| Warning          |  `#A97615` | `#D9B44A` |
| Error            |  `#AD4941` | `#ED6A5A` |

## 8. Midnight Burgundy

**Category:** Premium / Executive

A premium theme for executive-facing, financial, legal, and high-end enterprise products.

| UI role          | Light mode | Dark mode |
| ---------------- | ---------: | --------: |
| Background       |  `#F7F2F3` | `#120D11` |
| Surface          |  `#FFFFFF` | `#21161D` |
| Elevated surface |  `#EEE5E7` | `#30212A` |
| Primary          |  `#882F46` | `#D06B82` |
| Secondary        |  `#786241` | `#D4B181` |
| Accent           |  `#67558F` | `#A795D2` |
| Main text        |  `#2A2023` | `#F5EDF0` |
| Muted text       |  `#796970` | `#B29FA7` |
| Border           |  `#DDCFD3` | `#47343C` |
| Success          |  `#477455` | `#7BBD8A` |
| Warning          |  `#9A701B` | `#DDB45F` |
| Error            |  `#AC3F48` | `#ED7780` |

## 9. Cotton Candy

**Category:** Lifestyle / Playful

Soft pink, blue, and lavender designed to feel playful without becoming overly bright.

| UI role          | Light mode | Dark mode |
| ---------------- | ---------: | --------: |
| Background       |  `#FFF7FB` | `#17131C` |
| Surface          |  `#FFFFFF` | `#221B29` |
| Elevated surface |  `#FCECF6` | `#302438` |
| Primary          |  `#C54F8A` | `#F28AB8` |
| Secondary        |  `#4F8DBF` | `#82C4F2` |
| Accent           |  `#9A73C6` | `#C6A3EE` |
| Main text        |  `#322431` | `#FAF0F7` |
| Muted text       |  `#806C7B` | `#B8A5B4` |
| Border           |  `#E7CFDF` | `#4A394B` |
| Success          |  `#38806B` | `#70C8A8` |
| Warning          |  `#A96D17` | `#E4B85E` |
| Error            |  `#B84664` | `#F17E99` |

## 10. Boba Tea

**Category:** Lifestyle / Food

Cream, brown sugar, taro, and matcha-inspired colors.

| UI role          | Light mode | Dark mode |
| ---------------- | ---------: | --------: |
| Background       |  `#F8F1E7` | `#171310` |
| Surface          |  `#FFFDF8` | `#241D19` |
| Elevated surface |  `#F0E3D3` | `#322721` |
| Primary          |  `#74452F` | `#D6A27B` |
| Secondary        |  `#785B91` | `#B89BD2` |
| Accent           |  `#73905D` | `#A8C98D` |
| Main text        |  `#30251F` | `#F6EEE8` |
| Muted text       |  `#7A6B61` | `#B4A59B` |
| Border           |  `#DED0C2` | `#4A3B32` |
| Success          |  `#557948` | `#91C27E` |
| Warning          |  `#A67018` | `#DDB45F` |
| Error            |  `#A84A42` | `#E98277` |

## 11. Red Panda

**Category:** Nature / Playful

Warm russet, forest green, charcoal, and cream inspired by red panda coloring.

| UI role          | Light mode | Dark mode |
| ---------------- | ---------: | --------: |
| Background       |  `#F6F1E9` | `#141311` |
| Surface          |  `#FFFDFC` | `#211E1B` |
| Elevated surface |  `#EEE4D8` | `#2E2924` |
| Primary          |  `#A64628` | `#E27A50` |
| Secondary        |  `#375E4B` | `#72AE8E` |
| Accent           |  `#D18A37` | `#F0B663` |
| Main text        |  `#292522` | `#F4EFEB` |
| Muted text       |  `#716861` | `#ABA19A` |
| Border           |  `#D8CEC4` | `#433B35` |
| Success          |  `#3F7658` | `#72BD91` |
| Warning          |  `#9B6B16` | `#F0B663` |
| Error            |  `#A43B37` | `#E9756D` |

## 12. Japanese Cherry Blossom

**Category:** Culture / Wellness

Sakura pink, muted indigo, ink gray, and warm paper tones.

| UI role          | Light mode | Dark mode |
| ---------------- | ---------: | --------: |
| Background       |  `#FAF5F3` | `#151318` |
| Surface          |  `#FFFCFB` | `#211D25` |
| Elevated surface |  `#F3E7E8` | `#2E2733` |
| Primary          |  `#B84D72` | `#E88BAA` |
| Secondary        |  `#4F5678` | `#929AC9` |
| Accent           |  `#C7887B` | `#E5AE9F` |
| Main text        |  `#2B262C` | `#F5EFF3` |
| Muted text       |  `#776B72` | `#ADA0A8` |
| Border           |  `#DFD1D5` | `#463B47` |
| Success          |  `#4B7860` | `#83BE9D` |
| Warning          |  `#A56D1B` | `#E1B15E` |
| Error            |  `#A84050` | `#E77787` |

## 13. Paris

**Category:** City / Editorial

Elegant cream, navy, wine red, and muted gold inspired by Parisian editorial design.

| UI role          | Light mode | Dark mode |
| ---------------- | ---------: | --------: |
| Background       |  `#F7F3EC` | `#12151B` |
| Surface          |  `#FFFDF9` | `#1C222B` |
| Elevated surface |  `#ECE5D9` | `#282F3A` |
| Primary          |  `#213B5C` | `#7FA5D3` |
| Secondary        |  `#8B3048` | `#D77D93` |
| Accent           |  `#AA7D32` | `#DDB967` |
| Main text        |  `#282521` | `#F3F0EA` |
| Muted text       |  `#746F67` | `#A9A49C` |
| Border           |  `#D9D0C3` | `#3F4855` |
| Success          |  `#477152` | `#79B98A` |
| Warning          |  `#9B6D18` | `#DDB967` |
| Error            |  `#A43D43` | `#E8757B` |

## 14. London

**Category:** City / Enterprise

Fog gray, royal blue, brick red, and brass inspired by London streets and architecture.

| UI role          | Light mode | Dark mode |
| ---------------- | ---------: | --------: |
| Background       |  `#F1F3F4` | `#111519` |
| Surface          |  `#FFFFFF` | `#1B2229` |
| Elevated surface |  `#E3E7EA` | `#27313A` |
| Primary          |  `#245A86` | `#71A9D3` |
| Secondary        |  `#9B3F3A` | `#DF7C75` |
| Accent           |  `#9B762E` | `#D5AD5E` |
| Main text        |  `#252B30` | `#EDF1F3` |
| Muted text       |  `#68727A` | `#9DA9B1` |
| Border           |  `#CCD3D8` | `#3C4852` |
| Success          |  `#417052` | `#73B689` |
| Warning          |  `#9B762E` | `#D5AD5E` |
| Error            |  `#A53D3D` | `#E97575` |

## 15. Seoul

**Category:** City / Technology

A modern neon-inspired theme using restrained blue, violet, and coral.

| UI role          | Light mode | Dark mode |
| ---------------- | ---------: | --------: |
| Background       |  `#F4F6FA` | `#0E1119` |
| Surface          |  `#FFFFFF` | `#171C27` |
| Elevated surface |  `#E9EDF5` | `#222938` |
| Primary          |  `#3768C7` | `#78A5FF` |
| Secondary        |  `#8B4BC1` | `#C18BE8` |
| Accent           |  `#D65F6F` | `#F28A99` |
| Main text        |  `#202531` | `#F1F4FA` |
| Muted text       |  `#6B7280` | `#9DA6B8` |
| Border           |  `#D2D8E4` | `#384155` |
| Success          |  `#37816B` | `#6AC5A2` |
| Warning          |  `#A87317` | `#E2B25F` |
| Error            |  `#B74154` | `#EF7486` |

## 16. Los Angeles

**Category:** City / Creative

Sunset coral, ocean blue, palm green, and warm sand.

| UI role          | Light mode | Dark mode |
| ---------------- | ---------: | --------: |
| Background       |  `#FFF7EE` | `#151316` |
| Surface          |  `#FFFFFF` | `#211C21` |
| Elevated surface |  `#F6E9DA` | `#30272E` |
| Primary          |  `#D45B45` | `#F18A72` |
| Secondary        |  `#287EA3` | `#67B7D8` |
| Accent           |  `#B9802E` | `#E2B25F` |
| Main text        |  `#302824` | `#F7F0EC` |
| Muted text       |  `#7A6E67` | `#B0A39D` |
| Border           |  `#E1D3C7` | `#493D44` |
| Success          |  `#3E7B5E` | `#76C197` |
| Warning          |  `#A86F18` | `#E2B25F` |
| Error            |  `#B84545` | `#EF7979` |

## 17. New York City

**Category:** City / Finance

Concrete gray, taxi yellow, midnight navy, and architectural red.

| UI role          | Light mode | Dark mode |
| ---------------- | ---------: | --------: |
| Background       |  `#F1F2F3` | `#0F1216` |
| Surface          |  `#FFFFFF` | `#191E25` |
| Elevated surface |  `#E4E7EA` | `#252C35` |
| Primary          |  `#243B55` | `#7699BE` |
| Secondary        |  `#A83D3D` | `#E47777` |
| Accent           |  `#B98200` | `#F4C342` |
| Main text        |  `#202428` | `#F0F2F4` |
| Muted text       |  `#697078` | `#9EA6AE` |
| Border           |  `#CDD2D6` | `#39434D` |
| Success          |  `#397052` | `#6FBC8D` |
| Warning          |  `#9B6D00` | `#F4C342` |
| Error            |  `#A63838` | `#EA7070` |

## 18. Scuderia Red

**Category:** F1 Team Inspired

Italian racing red, carbon black, and warm metallic yellow.

| UI role          | Light mode | Dark mode |
| ---------------- | ---------: | --------: |
| Background       |  `#F7F4F2` | `#121010` |
| Surface          |  `#FFFFFF` | `#1D1919` |
| Elevated surface |  `#EEE7E5` | `#2A2222` |
| Primary          |  `#C81D25` | `#FF4A50` |
| Secondary        |  `#25282B` | `#AEB5BC` |
| Accent           |  `#C9971A` | `#F2C94C` |
| Main text        |  `#241F1F` | `#F7F1F1` |
| Muted text       |  `#756B6B` | `#AA9F9F` |
| Border           |  `#D9CECC` | `#443737` |
| Success          |  `#3C7655` | `#72C28F` |
| Warning          |  `#A97813` | `#F2C94C` |
| Error            |  `#A82B31` | `#FF777B` |

## 19. Silver Arrow

**Category:** F1 Team Inspired

Precision silver, graphite, turquoise, and cool cyan.

| UI role          | Light mode | Dark mode |
| ---------------- | ---------: | --------: |
| Background       |  `#F2F5F6` | `#0D1114` |
| Surface          |  `#FFFFFF` | `#171D21` |
| Elevated surface |  `#E5EAEC` | `#222A30` |
| Primary          |  `#007F79` | `#25D0C5` |
| Secondary        |  `#59636B` | `#AAB4BC` |
| Accent           |  `#1A91A8` | `#54C7DF` |
| Main text        |  `#20272B` | `#F1F5F6` |
| Muted text       |  `#68747A` | `#98A5AC` |
| Border           |  `#CAD2D6` | `#364149` |
| Success          |  `#28745D` | `#65C59B` |
| Warning          |  `#A66F17` | `#E1B15E` |
| Error            |  `#A84049` | `#ED7982` |

## 20. Papaya Racing

**Category:** F1 Team Inspired

Papaya orange, electric blue, anthracite, and bright white.

| UI role          | Light mode | Dark mode |
| ---------------- | ---------: | --------: |
| Background       |  `#F7F6F2` | `#111315` |
| Surface          |  `#FFFFFF` | `#1B1F23` |
| Elevated surface |  `#ECEAE4` | `#272D32` |
| Primary          |  `#D95E00` | `#FF8A2A` |
| Secondary        |  `#1976B9` | `#55B6F3` |
| Accent           |  `#6945A1` | `#A986E4` |
| Main text        |  `#252525` | `#F4F5F5` |
| Muted text       |  `#706F6B` | `#A1A5A8` |
| Border           |  `#D6D3CC` | `#3A4248` |
| Success          |  `#347657` | `#6AC18D` |
| Warning          |  `#A96D17` | `#E4B85E` |
| Error            |  `#AE403C` | `#EE7771` |

## 21. Midnight Bull

**Category:** F1 Team Inspired

Deep navy, electric red, cool blue, and metallic gold.

| UI role          | Light mode | Dark mode |
| ---------------- | ---------: | --------: |
| Background       |  `#F2F4F7` | `#090D18` |
| Surface          |  `#FFFFFF` | `#12182A` |
| Elevated surface |  `#E5E9F0` | `#1D2540` |
| Primary          |  `#273B80` | `#6F8EFF` |
| Secondary        |  `#C9313A` | `#F0646B` |
| Accent           |  `#B28619` | `#F0C44E` |
| Main text        |  `#202534` | `#F1F4FC` |
| Muted text       |  `#6A7180` | `#9CA6BB` |
| Border           |  `#CFD5E0` | `#35405A` |
| Success          |  `#36775E` | `#6CC49B` |
| Warning          |  `#9B7015` | `#F0C44E` |
| Error            |  `#A8343B` | `#EF7077` |

## 22. British Racing Green

**Category:** F1 Team Inspired

Classic racing green, cream, brass, and deep charcoal.

| UI role          | Light mode | Dark mode |
| ---------------- | ---------: | --------: |
| Background       |  `#F3F3EC` | `#101512` |
| Surface          |  `#FFFDF7` | `#18221C` |
| Elevated surface |  `#E8E8DD` | `#243128` |
| Primary          |  `#14543D` | `#55A982` |
| Secondary        |  `#64756B` | `#94B0A0` |
| Accent           |  `#A77A2B` | `#DDB45F` |
| Main text        |  `#222A25` | `#F0F5F2` |
| Muted text       |  `#69736D` | `#9EAAA3` |
| Border           |  `#CFD5CE` | `#3A4A40` |
| Success          |  `#317252` | `#68BF8E` |
| Warning          |  `#997018` | `#DDB45F` |
| Error            |  `#A34742` | `#E87A74` |

## 23. Alpine Tricolor

**Category:** F1 Team Inspired

French blue, racing red, icy white, and subtle pink.

| UI role          | Light mode | Dark mode |
| ---------------- | ---------: | --------: |
| Background       |  `#F4F6FA` | `#0E121B` |
| Surface          |  `#FFFFFF` | `#171D2A` |
| Elevated surface |  `#E9EDF5` | `#232B3B` |
| Primary          |  `#275DB7` | `#6E9FFF` |
| Secondary        |  `#C74855` | `#EF7985` |
| Accent           |  `#C75E92` | `#E796BE` |
| Main text        |  `#202633` | `#F2F5FA` |
| Muted text       |  `#6A7281` | `#9EA8BA` |
| Border           |  `#D0D7E4` | `#39445A` |
| Success          |  `#39785D` | `#70C39A` |
| Warning          |  `#A87217` | `#E0B35C` |
| Error            |  `#AD3D4B` | `#EF7380` |

## 24. Monaco Night

**Category:** F1 Track Inspired

Midnight harbor blue, yacht white, casino gold, and Riviera red.

| UI role          | Light mode | Dark mode |
| ---------------- | ---------: | --------: |
| Background       |  `#F5F5F1` | `#09111A` |
| Surface          |  `#FFFFFF` | `#121D29` |
| Elevated surface |  `#E9EAE6` | `#1E2B39` |
| Primary          |  `#184B72` | `#65A7D5` |
| Secondary        |  `#9E313A` | `#DD7078` |
| Accent           |  `#AE842D` | `#E5C064` |
| Main text        |  `#22272A` | `#F2F5F7` |
| Muted text       |  `#697176` | `#9DA9B1` |
| Border           |  `#CFD4D5` | `#354553` |
| Success          |  `#39745A` | `#6FC095` |
| Warning          |  `#9A7318` | `#E5C064` |
| Error            |  `#A43B43` | `#EA747C` |

## 25. Suzuka Sakura

**Category:** F1 Track Inspired

Sakura pink, circuit red, Japanese indigo, and soft concrete gray.

| UI role          | Light mode | Dark mode |
| ---------------- | ---------: | --------: |
| Background       |  `#F8F4F5` | `#141218` |
| Surface          |  `#FFFFFF` | `#201C26` |
| Elevated surface |  `#EEE5E8` | `#2C2634` |
| Primary          |  `#B84358` | `#E8798C` |
| Secondary        |  `#3D4F7A` | `#8398CE` |
| Accent           |  `#D78EA4` | `#F0ADC0` |
| Main text        |  `#29252B` | `#F5EFF3` |
| Muted text       |  `#756B73` | `#ACA0A8` |
| Border           |  `#DCD0D5` | `#463B49` |
| Success          |  `#477760` | `#7EC09D` |
| Warning          |  `#A76E18` | `#E1B15E` |
| Error            |  `#A83E4A` | `#EA7380` |

## 26. Spa Ardennes

**Category:** F1 Track Inspired

Forest green, rain blue, slate gray, and safety yellow.

| UI role          | Light mode | Dark mode |
| ---------------- | ---------: | --------: |
| Background       |  `#F1F4F1` | `#101512` |
| Surface          |  `#FFFFFF` | `#19211D` |
| Elevated surface |  `#E4EAE6` | `#253029` |
| Primary          |  `#2D6650` | `#70B493` |
| Secondary        |  `#3E718A` | `#78B5D0` |
| Accent           |  `#B78B16` | `#E6C652` |
| Main text        |  `#222925` | `#EFF4F1` |
| Muted text       |  `#69736D` | `#9FAAA4` |
| Border           |  `#CDD6D0` | `#3B4941` |
| Success          |  `#367855` | `#6CC38D` |
| Warning          |  `#9B7512` | `#E6C652` |
| Error            |  `#A64442` | `#E97874` |

## 27. Singapore Night Race

**Category:** F1 Track Inspired

Black glass, neon violet, cyan, and hot magenta.

| UI role          | Light mode | Dark mode |
| ---------------- | ---------: | --------: |
| Background       |  `#F4F4F8` | `#0A0B13` |
| Surface          |  `#FFFFFF` | `#141624` |
| Elevated surface |  `#E9E8F0` | `#202338` |
| Primary          |  `#6054B8` | `#9C8FFF` |
| Secondary        |  `#087E98` | `#39C4DF` |
| Accent           |  `#C13D87` | `#F073B3` |
| Main text        |  `#242431` | `#F3F3FA` |
| Muted text       |  `#6F6E7C` | `#A3A4B7` |
| Border           |  `#D2D1DD` | `#393C55` |
| Success          |  `#347A64` | `#68C4A1` |
| Warning          |  `#A87317` | `#E2B25F` |
| Error            |  `#AC3F5C` | `#ED7692` |

## 28. Monza Rosso

**Category:** F1 Track Inspired

Italian red, racing green, cream, and asphalt gray.

| UI role          | Light mode | Dark mode |
| ---------------- | ---------: | --------: |
| Background       |  `#F7F4EE` | `#131211` |
| Surface          |  `#FFFFFF` | `#201D1A` |
| Elevated surface |  `#ECE6DC` | `#2C2722` |
| Primary          |  `#C52828` | `#F15A5A` |
| Secondary        |  `#356A50` | `#74B18F` |
| Accent           |  `#B48026` | `#E2B75D` |
| Main text        |  `#292521` | `#F5F0EA` |
| Muted text       |  `#736C65` | `#AAA19A` |
| Border           |  `#D8D0C6` | `#453D36` |
| Success          |  `#397356` | `#70BC8E` |
| Warning          |  `#9B7018` | `#E2B75D` |
| Error            |  `#AA3636` | `#EB7272` |

## Recommended component mapping

| Component                               | Recommended token       |
| --------------------------------------- | ----------------------- |
| App canvas                              | `--ui-background`       |
| Cards, panels, modals                   | `--ui-surface`          |
| Raised cards and selected panels        | `--ui-surface-elevated` |
| Primary buttons and selected navigation | `--ui-primary`          |
| Secondary actions and chart series      | `--ui-secondary`        |
| Highlights, badges, and key metrics     | `--ui-accent`           |
| Headings and body copy                  | `--ui-text-primary`     |
| Metadata and supporting labels          | `--ui-text-secondary`   |
| Dividers, inputs, and card outlines     | `--ui-border`           |
| Positive status                         | `--ui-success`          |
| Cautionary status                       | `--ui-warning`          |
| Destructive or critical status          | `--ui-error`            |

## CSS implementation template

Replace the example values with the selected theme palette.

```css
:root {
  color-scheme: light;

  --ui-background: #f4f0e7;
  --ui-surface: #fffcf6;
  --ui-surface-elevated: #ffffff;
  --ui-primary: #17365d;
  --ui-secondary: #7d2636;
  --ui-accent: #b98224;
  --ui-text-primary: #211f1b;
  --ui-text-secondary: #6f6a61;
  --ui-border: #d7cfc1;
  --ui-success: #39724a;
  --ui-warning: #9c6712;
  --ui-error: #a43b3b;
}

[data-theme="dark"] {
  color-scheme: dark;

  --ui-background: #12171e;
  --ui-surface: #1a212b;
  --ui-surface-elevated: #222b37;
  --ui-primary: #79a9e0;
  --ui-secondary: #d98091;
  --ui-accent: #e4b85e;
  --ui-text-primary: #f0f3f6;
  --ui-text-secondary: #9da8b5;
  --ui-border: #35404d;
  --ui-success: #69c483;
  --ui-warning: #e4b85e;
  --ui-error: #f07878;
}
```

## Interaction-state guidance

- **Hover:** shift the relevant surface or action color by approximately 6–10% in perceived lightness.
- **Pressed:** shift by approximately 10–14% and reduce shadow elevation.
- **Focus:** use a 2 px ring based on the primary token with sufficient contrast against the surrounding surface.
- **Disabled:** reduce contrast and saturation, but preserve legibility.
- **Selected navigation:** combine a tinted primary background with primary-colored text or iconography.
- **Charts:** use primary, secondary, and accent first; introduce additional hues only when necessary.
- **F1-inspired themes:** reserve bright red, yellow, and orange for meaningful performance or status changes when possible.

## Suggested product-theme pairings

| Product type                               | Recommended themes                                               |
| ------------------------------------------ | ---------------------------------------------------------------- |
| Investment research and private equity     | Editorial Finance, New York City, Midnight Burgundy              |
| Healthcare and medical software            | Modern Apothecary, Japanese Cherry Blossom                       |
| Manufacturing and industrial operations    | Copper Industrial, Spa Ardennes                                  |
| AI, developer, or cybersecurity tools      | Obsidian Terminal, Deep Ocean Intelligence, Singapore Night Race |
| Consumer lifestyle applications            | Cotton Candy, Boba Tea, Los Angeles                              |
| Premium automotive or luxury products      | British Racing Green, Monaco Night, Paris                        |
| Sports, racing, and performance dashboards | Scuderia Red, Silver Arrow, Papaya Racing, Midnight Bull         |
| General enterprise software                | Neo-Swiss, London, Aerospace Command                             |

## Naming and trademark note

The racing palettes are descriptive, unofficial themes inspired by motorsport aesthetics. Avoid using protected team logos, official marks, or implying sponsorship or endorsement without permission.
