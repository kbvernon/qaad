
library(here)
library(FedData)
library(MASS)
library(sf)
library(terra)
library(tidyverse)
library(viridis)

# Advertising -------------------------------------------------------------

# advertising dataset used in James et al (2021) Introduction to Statistical Learning

advertising <- read_csv("https://www.statlearning.com/s/Advertising.csv")

advertising <- advertising %>% 
  rename_with(tolower) %>% 
  select(sales, tv, radio, newspaper)

write_csv(
  advertising, 
  file = here("datasets", "advertising.csv")
)

# Kid's IQ ----------------------------------------------------------------

# https://cran.r-project.org/web/packages/rstanarm/rstanarm.pdf

library(rstanarm)

kidiq <- kidiq %>% 
  rename(
    "kid" = kid_score,
    "mom" = mom_iq
  ) %>% 
  select(kid, mom, everything())

write_csv(
  kidiq,
  file = here("datasets", "kidiq.csv")
)

# Snodgrass ---------------------------------------------------------------

library(archdata)

data("Snodgrass")  

Snodgrass %>% 
  as_tibble() %>% 
  rename_with(tolower) %>% 
  mutate(inside = ifelse(inside == "Inside", 1L, 0L)) %>% 
  write_csv(here("datasets", "snodgrass.csv"))

# Site counts by elevation ------------------------------------------------

n <- 100

set.seed(123)

elevation <- rnorm(n, mean = 1.5, sd = 0.3)

b0 <- log(2)
b1 <- log(3.5)

lambda <- exp(b0 + b1 * elevation) 

sites <- rpois(n, lambda)

write_csv(
  tibble(sites, elevation),
  here("datasets", "site_counts.csv")
)

# Grave goods by distance from great house --------------------------------

n <- 100

set.seed(123)

distance <- runif(n, min = 0.01, max = 8)
distance <- round(distance, digits = 3)

b0 <- log(7)
b1 <- log(0.73)

lambda <- exp(b0 + b1 * distance) 

goods <- rpois(n, lambda)

write_csv(
  tibble(goods, distance),
  here("datasets", "grave_goods.csv")
)

# Site counts per unit area by elevation ----------------------------------

n <- 100

set.seed(123)

elevation <- rnorm(n, mean = 1.5, sd = 0.3)

b0 <- log(2)
b1 <- log(3.1)

area <- abs(rnorm(n, mean = 4, sd = 1.6))

ba <- 1.4

lambda <- exp(b0 + b1 * elevation + ba * log(area)) 

sites <- rpois(n, lambda)

surveys <- tibble(
  block = 1:n,
  sites = sites,
  area = area,
  elevation = elevation
)

write_csv(
  surveys,
  here("datasets", "surveys.csv")
)

# Violent trauma ----------------------------------------------------------

n <- 100

set.seed(1941)

ppt <- rnorm(n, mean = 6.5, sd = 1.35)

b0 <- log(5)
b1 <- log(0.03)

span <- abs(rnorm(n, mean = 3, sd = 1.1))

bs <- 1.4

lambda <- exp(b0 + b1 * ppt + bs * log(span)) 

trauma <- rpois(n, lambda)

plot(ppt, trauma)

surveys <- tibble(
  block = 1:n,
  sites = sites,
  area = area,
  elevation = elevation
)

write_csv(
  surveys,
  here("datasets", "surveys.csv")
)



# survey polygons ---------------------------------------------------------

# somewhere in San Juan County, UT
surveys <- list(
  matrix(
    c(464, 4100, # in kilometers
      464, 4110, 
      474, 4110, 
      474, 4100, 
      464, 4100),
    ncol = 2, 
    byrow = TRUE
  )
) %>% 
  st_polygon()

surveys <- list(
  surveys + c(03, 17),
  surveys + c(17, 23),
  surveys + c(25, 05),
  surveys + c(40, 11),
  surveys + c(12, 38),
  surveys + c(53, 03),
  surveys + c(57, 14),
  surveys + c(31, 36)
) %>% 
  map(~.x * 1000) %>% # convert to meters
  st_sfc(crs = 26912) %>% 
  st_sf() %>% 
  mutate(survey = LETTERS[1:n()])

gpkg <- here("datasets", "qaad.gpkg")

write_sf(
  surveys,
  dsn = gpkg,
  layer = "surveys"
)


# survey polygon elevations -----------------------------------------------

elevation <- get_ned(surveys, label = "sjco")

elevation <- elevation %>% 
  rast() %>% 
  project("epsg:26912")

elevation <- elevation %>% 
  resample(
    rast(
      extent = ext(elevation),
      resolution = c(100, 100),
      crs = crs(elevation)
    )
  ) %>% 
  mask(vect(surveys))

names(elevation) <- "elevation"

writeRaster(
  elevation,
  filename = here("datasets", "elevation.tif")
)

# feature counts with mixed effects ---------------------------------------

ngroups <- nrow(surveys)
nsites <- rpois(ngroups, 50) # number of sites in each survey polygon
nobservations <- sum(nsites) # total number of sites

set.seed(123)

sites <- st_sample(surveys, size = nsites) %>% 
  st_sfc() %>% 
  st_sf() %>% 
  mutate(site = 1:n()) %>% 
  st_join(surveys) 

write_sf(
  sites,
  dsn = gpkg,
  layer = "sites"
)

# convert to kilometers and reduce by one
# makes it easier to simulate response with a poisson
sites$elevation <- terra::extract(elevation, vect(sites))[,2]/1000 - 1

sites <- st_drop_geometry(sites)

set.seed(123)

b0 <- 1.32
b1 <- 0.75

b0_var <- 0.5
b1_var <- 0.4
res_re <- 0.1

sigma <- matrix(
  c(b0_var, res_re, res_re, b1_var),
  nrow = 2,
  ncol = 2
)

re <- mvrnorm(ngroups, mu = c(0, 0), sigma)

b0_re <- rep(re[,1], rev(nsites))
b1_re <- rep(re[,2], rev(nsites))

lambda <- exp((b0 + b0_re) + (b1 + b1_re) * sites$elevation)

y <- rpois(nobservations, lambda)

sites$residential <- y

# fit_glmer <- lme4::glmer(
#   residential ~ elevation + (elevation|survey),
#   data = sites,
#   family = poisson
# )

write_csv(
  sites,
  file = here("datasets", "survey-polygons_sites.csv")
)


# patch residence ---------------------------------------------------------

set.seed(6742)

n <- 50

x <- seq(0, 10, length = n)

y <- (50 * dnorm(x, 4.3, sd = 2.3)) + rnorm(n)
y <- scales::rescale(y, to = c(0, 5.9))

# plot(x,y)

female <- tibble(sex = "female", distance = x, time = y)

y <- (30 * dnorm(x, 7.3, sd = 1.8)) + rnorm(n) + log(x + 0.01)
y <- scales::rescale(y, to = c(0.5, 5.1))

# plot(x,y)

male <- tibble(sex = "male", distance = x, time = y)

write_csv(
  bind_rows(female, male),
  file = here("datasets", "patch-residence.csv")
)

