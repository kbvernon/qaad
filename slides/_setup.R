
library(here)
library(ggfx)
library(ggtext)
library(glue)
library(gt)
library(htmltools)
library(tidyverse)
library(viridis)

options(
  digits = 4,
  scipen = 999, # remove scientific notation
  htmltools.dir.version = FALSE,
  str = strOptions(vec.len = 4),
  knitr.kable.NA = ''
)

# for understanding font size and dpi in ggplot, see
# https://www.christophenicault.com/post/understand_size_dimension_ggplot2/
sysfonts::font_add_google("Source Sans Pro", "plot-font")

showtext::showtext_auto()
showtext::showtext_opts(dpi = 300)

ggplot2::theme_set(ggplot2::theme_bw(14))
ggplot2::theme_update(
  panel.grid = element_blank(),
  plot.margin = margin(4, 2, 4, 4, "pt"),
  text = element_text(family = "plot-font"),
)

qcolors <- function(...){
  
  qaad_palette <- c(
    lincoln = "#105622",
    eerie = "#171614",
    sapphire = "#0C556D",
    blue = "#0094C6",
    wintergreen = "#6B8F7E",
    gold = "#D1B817",
    bronze = "#D58936",
    space = "#37423D",
    kobe = "#942911"
  )
  
  choices <- unlist(list(...))
  
  if (length(choices) == 0) return(qaad_palette)
  
  unname(qaad_palette[choices])
  
} 