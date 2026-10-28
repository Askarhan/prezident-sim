# Источники карты

Все данные карты — в общественном достоянии (public domain), можно использовать в коммерческой игре.

- **Спутниковый снимок**: NASA Earth Observatory, Blue Marble Next Generation (topography + bathymetry), Reto Stöckli, NASA GSFC. 
- **Рельеф (подсветка гор)**: Natural Earth shaded relief (Tom Patterson, shadedrelief.com), из пакета matplotlib/basemap-data.
- **Границы стран**: Natural Earth 1:50m Admin 0 boundary lines (naturalearthdata.com).
- **Контуры стран для нажатий**: jsVectorMap world map (MIT).

Сборка тайлов: `tools/sat/build_sat.py`, границ: `tools/sat/build_borders.py`.
