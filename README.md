# ts-labling
Interface for labeling high-volume image data in box for deep learning 

Visit and label some of our images [**Here**](https://ts-labeling-fw7xsftxo-skirby.vercel.app/).

---

## Overview

The goal of this web application is to enable our Deep Learning Research lab and the Alabama Department of Transportation to label a high volume of images for a classification model. Images come from a 1080p camera facing an active highway in downtown Tuscaloosa, and we need to label as many of them as possible with individual lane congestion values. Our model seeks to determine which of the lanes are prone to traffic accidents, and warn drivers with a sign in real-time.

This is done by using a Box App to pull images from UA's domain, pump them to your browser, and save selected labels in a [MongoDB Atlas](www.mongodb.com/cloud/atlas) cluster. This app was written in [Typescript](https://www.typescriptlang.org/) using [NextJS](https://nextjs.org/) and deployed with [Vercel](vercel.com/). 

---

## Credit

- [Stephen Kirby](https://www.linkedin.com/in/stephen-kirby-470332191)
- Abigail Payne
- [Dr. Travis Atkison](http://atkison.cs.ua.edu/)
