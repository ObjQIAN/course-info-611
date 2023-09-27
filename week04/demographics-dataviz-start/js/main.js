let map = L.map('census-map',{zoomsnap: 0,});
map.setView([39.96,-75.15],11)

L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png'.{
    maxZoom: 19,
    attribution: '&copy; <a href=>'
})