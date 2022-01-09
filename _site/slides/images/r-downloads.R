
library(cranlogs)
library(dplyr)
library(here)
library(lubridate)
library(readr)

# Here's an easy way to get all the URLs in R
# the RStudio mirror was started in 2012, but cranlogs actually only goes back to 2015
# https://github.com/r-hub/cranlogs/issues/41
start <- as.Date('2015-01-01')
today <- as.Date(Sys.Date(), "%Y-%m-%d")

cran <- cran_downloads(
  packages = "R",
  from = start,
  to = today
) %>% 
  group_by(
    month = floor_date(date, "month")
  ) %>%
  summarize(
    count = n()
  )

write_rds(cran, file = here("slides", "images", "r-downloads.rds"))


