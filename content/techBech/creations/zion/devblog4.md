- Like I mentioned earlier, I wanted to sort out the rendering issues and fix up other parts of the code before implimenting the large next part. 

- Initially, I thought I came up with an obvious solution but whilst implimenting it, I realized that wouldn't work because the frame needs to be redrawn mostly from scratch to facilitate the background remaining the same and many other things. In the future though I definately will optimize it even further its just at that point today I was like "okay so how can I make this faster". 
- A lot of stumbling around and trying to get an answer out of Claude later, I realized that the way that games and other things are able to render so many things on the screen is that they are sending things to the GPU and the GPU is great at drawing things where you tell it. THis is all well and good because I was telling it many things to draw exactly where each frame. 
- The issue arises when you break up those calls to the GPU. That's exactly what I was doing. Unbeknownest to me, a single print statement was reducing my framerate by around 2,000-10,000 FPS. What this line would do is it would prompt the CPU to send something to the terminal and then wait for it to display then return and then continue with the GPU stuff for the rest of the frame. The major issue was that I was printing the locations of each package on the screen. When you have like 50 pacakges on screen that is 50 print statements that the CPU has to call every frame, effectively screwing up the GPU. I don't fully understand it but this much was enough to satisfy me so that I could move on. 

- This is a GIF of the version with the print statement:

![lowfps]{assets/beforechange.gif}

- This is a GIF of after having changed it: 

![highfps]{assets/afterchange.gif}

- The GIFs are kinda jank because I screen recorded it then turned it into a MP4 and then into a GIF and then compressed that. 

