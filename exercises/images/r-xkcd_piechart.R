

# library(extrafont)
#
# download.file("http://simonsoftware.se/other/xkcd.ttf",
#               dest = here::here("data-raw/xkcd.ttf"),
#               mode = "wb")
#
# system("mkdir ~/.fonts")
# system("cp xkcd.ttf  ~/.fonts")
#
# font_import(pattern = "kcd", prompt = FALSE)
#
# fonts()
#
# loadfonts(device="win")

library(ggplot2)
library(xkcd)
library(cowplot)

# Create Data
dat <- data.frame(
  group = c("Never", "When explaining never\nto use a pie chart"),
  value = c(99, 1)
)


# Basic piechart
piechart <- ggplot(dat, aes(x = "", y = value, fill = group)) +
  geom_bar(stat = "identity", width = 1) +
  coord_polar("y", start = 14.5) +
  scale_fill_manual(values = c("#dedede", "#2e2e2e"),  name = NULL) +
  theme_void() +
  theme_xkcd() +
  ggtitle("When to use a pie chart?") +
  theme(
    plot.title = element_text(hjust = 0.5,
                              margin = margin(b = -15, unit = "pt")),
    legend.key.width = unit(0.78, "cm"),
    legend.key.height = unit(0.78, "cm")
  )

datascaled <- data.frame(x = c(-3, 3), y = c(-30, 30))
xrange <- range(datascaled$x)
yrange <- range(datascaled$y)
ratioxy <- diff(xrange) / diff(yrange)

dataman <- data.frame(
  x = 0,
  y = 0,
  scale = 10,
  ratioxy = ratioxy,
  angleofspine =  -pi / 2,
  anglerighthumerus = -pi / 6,
  anglelefthumerus = pi + 1,
  anglerightradius = pi / 2,
  angleleftradius = pi + 1.2,
  angleleftleg = 5,
  anglerightleg = 4.5,
  angleofneck = 4
)

mapping <- aes(
  x = x,
  y = y,
  scale = scale,
  ratioxy = ratioxy,
  angleofspine = angleofspine,
  anglerighthumerus = anglerighthumerus,
  anglelefthumerus = anglelefthumerus,
  anglerightradius = anglerightradius,
  angleleftradius = angleleftradius,
  anglerightleg =  anglerightleg,
  angleleftleg = angleleftleg,
  angleofneck = angleofneck
)

stickman <-
  ggplot() + 
  xkcdman(
    mapping, 
    dataman, 
    inherit.aes = FALSE
  ) + 
  xlim(-2, 2) + 
  ylim(-28, 5) + 
  theme_void()

bob <-
  ggdraw(piechart, xlim = c(-0.2, 1)) + draw_plot(
    stickman,
    x = -0.28,
    y = 0,
    height = 0.7,
    width = 0.7
  )

ggsave(
  plot = bob,
  filename = here::here("labs/images/r-xkcd_piechart.png"),
  dpi = 300,
  width = 7,
  height = 3.74
)
