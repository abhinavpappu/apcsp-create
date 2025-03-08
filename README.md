# apcsp_create

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/abhinavpappu/apcsp-create)

Project for the AP Computer Science Principles CREATE task.

It's a code editor that allows you to actually run the pseudo code that APCSP uses. There's even a turtle simulator so you can use commands such as MOVE_FORWARD()!

Try it out here: https://apcsp-code.netlify.app/

Version of the pseudocode this project supports: [ap-computer-science-principles-exam-reference-sheet.pdf](./ap-computer-science-principles-exam-reference-sheet.pdf)

#### Notes:
  - You can use `=` or `<-` instead of `←` (you can also use `←` if you really want)
  - Similarly you can use `<=`, `>=` instead of `≤`, `≥` respectively
  - Limitation: In order to enable step forward and step backward, we save every "state" of the program. For convenience of implementation, I define that every function call (and only function calls) constitutes a state change (which you can observe with the step forward and backward commands). The entire set of states is precalculated when you click on run. Therefore, any program that uses more than 1000 "states" (function calls) is assumed to contain an infinite loop and the program terminates. If you're running a super long program on this tool for some reason, please run it locally and change the variable `MAX_STATES` in `App.vue`

Feel free to open issues for any bugs or any updates to the language specification! (Or attempt to read through the mess of code and contribute yourself!)

## How to run locally
Prerequisites: Install [Node.js](https://nodejs.org/) version `>= 10.16.0`
1. In the root folder of this repository, run `npm install`
2. Then run one of the following commands:
    - `npm run dev` (runs the development server which is super fast and updates live as changes are made to files)
    - `npm run build` (creates a folder called `dist` with the production build of plain HTML, CSS, and JS files)
    - `npm run serve` (runs a server to locally preview the production build)

## Deploying to production
- The easiest way to create your own copy of this site is to click on the `Deploy to Netlify` button at the top of this README and it should walk you through everything. It's free! (with limits that you'll probably never run into)
- If you already have a server that can serve static files, then click on the most recent workflow run in the [Actions tab](https://github.com/abhinavpappu/apcsp-create/actions/workflows/create-zip.yml) and scroll down to `Artifacts`. Then click on the artifact named `Build` to download a zip file containing static assets that can be copied over to the server.
  - You can also follow the instructions [above](#how-to-run-locally) and run `npm run build` to generate the same static assets

## License
[MIT](LICENSE)
