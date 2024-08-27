## `reporting/reports` folder

`x-pack/test/functional/apps/dashboard/group?/reporting/reports/__snapshots__`: this folder contains snapshots
(PNG files) used for PDF visual regression testing. In the testing library we use, "pdf-visual-diff", it is
necessary to convert PDF files to PNG, and compare the result to the snapshots located in this folder. 

`x-pack/test/functional/apps/dashboard/group?/reporting/reports/baseline`: this folder contains the snapshots
for PNG regression testing via "pngjs"
