


library(here)
library(osmdata)
library(sf)
library(tidyverse)
library(tigris)

# bb8 <- getbb("Salt Lake City, UT")

bb8 <- c(
  "xmin" = -111.989440,
  "xmax" = -111.804122,
  "ymin" = 40.702050,
  "ymax" = 40.792511
) %>%
  st_bbox() %>% 
  st_as_sfc() %>% 
  st_set_crs(4326) %>% 
  st_transform(26912) %>% 
  st_bbox()

midx <- (bb8[["xmax"]] + bb8[["xmin"]]) / 2
midy <- (bb8[["ymax"]] + bb8[["ymin"]]) / 2

dx <- bb8[["xmax"]] - bb8[["xmin"]]
dy <- dx * 9/16

bb8[["ymin"]] <- midy - (dy / 2)
bb8[["ymax"]] <- midy + (dy / 2)

bb8 <- bb8 %>% 
  st_as_sfc() %>% 
  st_set_crs(26912) %>% 
  st_transform(4326) %>% 
  st_bbox()

remove(midx, midy, dx, dy)

xmin <- bb8[["xmin"]]
xmax <- bb8[["xmax"]]
ymin <- bb8[["ymin"]]
ymax <- bb8[["ymax"]]

bb8 <- rbind(
  "x" = c(xmin, xmax),
  "y" = c(ymin, ymax)
)

colnames(bb8) <- c("min", "max")


highways <- bb8 %>%
  opq() %>%
  add_osm_feature(
    key = "highway",
    value = c(
      "motorway",
      "trunk",
      "primary",
      "secondary",
      "tertiary",
      "motorway_link",
      "trunk_link",
      "primary_link",
      "secondary_link",
      "tertiary_link"
    )
  ) %>%
  osmdata_sf()

streets <- bb8 %>%
  opq() %>%
  add_osm_feature(
    key = "highway",
    value = c(
      "residential",
      "living_street",
      "service",
      "unclassified",
      "pedestrian",
      "footway",
      "track",
      "path"
    )
  ) %>%
  osmdata_sf()

color_roads <- "#F0ECDF"

slc_map <- ggplot() +
  geom_sf(
    data = streets$osm_lines,
    col = color_roads,
    size = 0.4,
    alpha = 0.5
  ) +
  geom_sf(
    data = highways$osm_lines,
    col = color_roads,
    size = 0.6,
    alpha = 0.7
  ) +
  coord_sf(
    xlim = c(xmin, xmax),
    ylim = c(ymin, ymax),
    expand = FALSE
  ) +
  theme(legend.position = F) +
  theme_void()

# slc_map

ggsave(
  plot = slc_map,
  filename = here("slides", "images", "slc_map.png"),
  width = 16,
  height = 9,
  dpi = 150
)
