// Global variables for interactivity
let explosionSlider;
let targetExplosion = 0;
let currentExplosion = 0;

// Rocket part colors
let noseConeColor;
let payloadColor;
let avionicsColor;
let bodyTubeColor;
let finColor;
let engineColor;

function setup() {
  createCanvas(800, 600, WEBGL);

  // Define colors for the parts legend and 3D model
  noseConeColor = color(220, 50, 50);
  payloadColor = color(200, 200, 210);
  avionicsColor = color(50, 50, 60);
  bodyTubeColor = color(200, 200, 210);
  finColor = color(180, 40, 40);
  engineColor = color(80, 80, 90);

  // --- UI CONTROLS PANEL ---
  let controlsDiv = createDiv('');
  controlsDiv.style('position', 'absolute');
  controlsDiv.style('top', '10px');
  controlsDiv.style('left', '10px');
  controlsDiv.style('padding', '15px');
  controlsDiv.style('background-color', 'rgba(0, 0, 0, 0.6)');
  controlsDiv.style('color', 'white');
  controlsDiv.style('font-family', 'monospace');
  controlsDiv.style('border-radius', '8px');
  controlsDiv.style('width', '220px');
  controlsDiv.style('user-select', 'none');

  let title = createP('ROCKET VISUALIZATION');
  title.style('margin', '0 0 15px 0');
  title.style('text-align', 'center');
  title.style('font-weight', 'bold');
  title.parent(controlsDiv);

  let sliderLabel = createP('Explosion Factor:');
  sliderLabel.style('margin', '10px 0 5px 0');
  sliderLabel.parent(controlsDiv);

  explosionSlider = createSlider(0, 1, 0, 0.01);
  explosionSlider.style('width', '100%');
  explosionSlider.parent(controlsDiv);

  let buttonDiv = createDiv('');
  buttonDiv.style('margin-top', '15px');
  buttonDiv.style('display', 'flex');
  buttonDiv.style('justify-content', 'space-between');
  buttonDiv.parent(controlsDiv);

  let explodeButton = createButton('Explode');
  explodeButton.parent(buttonDiv);
  explodeButton.style('width', '48%');
  explodeButton.mousePressed(() => targetExplosion = 1);

  let resetButton = createButton('Assemble');
  resetButton.parent(buttonDiv);
  resetButton.style('width', '48%');
  resetButton.mousePressed(() => targetExplosion = 0);

  let instruction = createP('Drag mouse to rotate<br>Scroll to zoom');
  instruction.style('font-size', '12px');
  instruction.style('margin-top', '15px');
  instruction.style('color', '#ccc');
  instruction.style('text-align', 'center');
  instruction.parent(controlsDiv);

  // --- Parts Legend ---
  let legendTitle = createP('Parts Legend');
  legendTitle.style('margin', '20px 0 10px 0');
  legendTitle.style('border-top', '1px solid #555');
  legendTitle.style('padding-top', '15px');
  legendTitle.style('font-weight', 'bold');
  legendTitle.parent(controlsDiv);

  createLegendItem('Nose Cone', noseConeColor, controlsDiv);
  createLegendItem('Payload / Body', payloadColor, controlsDiv);
  createLegendItem('Avionics Coupler', avionicsColor, controlsDiv);
  createLegendItem('Fins', finColor, controlsDiv);
  createLegendItem('Engine', engineColor, controlsDiv);
}

function createLegendItem(name, c, parentDiv) {
  let item = createDiv('');
  item.style('display', 'flex');
  item.style('align-items', 'center');
  item.style('margin-bottom', '8px');
  item.style('font-size', '14px');

  let colorSwatch = createDiv('');
  colorSwatch.style('width', '15px');
  colorSwatch.style('height', '15px');
  colorSwatch.style('background-color', c.toString());
  colorSwatch.style('margin-right', '10px');
  colorSwatch.style('border', '1px solid #fff');
  colorSwatch.parent(item);

  let label = createSpan(name);
  label.parent(item);
  item.parent(parentDiv);
}


function draw() {
  background(10, 15, 30);
  noStroke();
  
  // Add an ambient starfield for atmosphere
  push();
  fill(200);
  for(let i=0; i<200; i++) {
    let x = (noise(i*10.1) * 2 - 1) * width * 2;
    let y = (noise(i*20.2) * 2 - 1) * height * 2;
    let z = (noise(i*30.3) * 2 - 1) * 1000 - 500;
    push();
    translate(x, y, z);
    sphere(1.5);
    pop();
  }
  pop();

  // Handle user interaction and animation
  let sliderVal = explosionSlider.value();
  if (abs(sliderVal - currentExplosion) > 0.02 && abs(sliderVal - targetExplosion) > 0.02) {
    // User is dragging the slider, so take direct control
    targetExplosion = sliderVal;
    currentExplosion = sliderVal;
  } else {
    // Animate towards the target set by the buttons
    currentExplosion = lerp(currentExplosion, targetExplosion, 0.05);
    explosionSlider.value(currentExplosion);
  }

  // Set up scene lighting
  ambientLight(80);
  directionalLight(255, 255, 255, 0.5, -0.5, -1);
  pointLight(255, 200, 200, 0, 400, 200);

  // Set up camera controls
  orbitControl();

  // Center the rocket in the view
  translate(0, 50, 0);
  rotateX(-0.2);
  
  // Draw each part of the rocket
  drawNoseCone(currentExplosion);
  drawPayloadBay(currentExplosion);
  drawAvionicsBay(currentExplosion);
  drawLowerBody(currentExplosion);
  drawFins(currentExplosion);
  drawEngine(currentExplosion);
}

function drawNoseCone(factor) {
  push();
  specularMaterial(noseConeColor);
  shininess(50);
  let yPos = -220 - factor * 150;
  translate(0, yPos, 0);
  rotateX(PI);
  cone(45, 120);
  pop();
}

function drawPayloadBay(factor) {
  push();
  specularMaterial(payloadColor);
  shininess(10);
  let yPos = -100 - factor * 80;
  translate(0, yPos, 0);
  cylinder(45, 120);
  pop();
}

function drawAvionicsBay(factor) {
  push();
  ambientMaterial(avionicsColor);
  // This part is the pivot, so it doesn't move vertically
  let yPos = -30;
  translate(0, yPos, 0);
  cylinder(43, 20); // Slightly narrower coupler
  pop();
}

function drawLowerBody(factor) {
  push();
  specularMaterial(bodyTubeColor);
  shininess(10);
  let yPos = 90 + factor * 80;
  translate(0, yPos, 0);
  cylinder(45, 200);
  pop();
}

function drawFins(factor) {
  const numFins = 4;
  for (let i = 0; i < numFins; i++) {
    push();
    specularMaterial(finColor);
    shininess(20);

    let yPos = 140 + factor * 80;
    let angle = (TWO_PI / numFins) * i;
    let radialOffset = 45 + factor * 80;

    translate(0, yPos, 0);
    rotateY(angle);
    translate(radialOffset + 30, 0, 0);
    rotateZ(-0.3); // Angled fin
    box(60, 140, 5);

    pop();
  }
}

function drawEngine(factor) {
  push();
  ambientMaterial(engineColor);
  let yPos = 200 + factor * 180;
  translate(0, yPos, 0);
  
  // Engine casing
  cylinder(40, 40);
  
  // Nozzle
  translate(0, 25, 0);
  rotateX(PI);
  cone(30, 30);
  pop();
}