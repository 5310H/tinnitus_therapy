// Trahreg Tinnitus Therapy Suite - MSKR Saddle v3.0 (Ergonomic)
// Optimized for Rakklor "Thin-Band" Bone Conduction Headphones

$fn = 64; 

// Fit parameters for Rakklor/Thin-band models
band_width = 5.5;  
band_depth = 4.5;
rounding_r = 2.5;  

module smoothed_element(size, r) {
    hull() {
        for (x=[r, size[0]-r], y=[r, size[1]-r], z=[r, size[2]-r]) {
            translate([x, y, z]) sphere(r);
        }
    }
}

module saddle_v3(is_left = true) {
    // --- Main Body (Ergonomic Clip) ---
    difference() {
        // Main rounded block for skin comfort
        translate([-8, -6, -10]) 
            smoothed_element([16, 14, 20], r=rounding_r);

        // Narrowed Cavity specifically for 4-5mm Titanium Bands
        hull() {
            translate([0, 0, -11]) cylinder(d=band_width, h=22);
            translate([0, 2, -11]) cylinder(d=band_width, h=22);
        }

        // Beveled snap-on entry
        translate([-1.5, -10, -11])
            cube([3, 10, 22]);

        // EXTERNAL WIRE RACEWAY (Snap-in)
        // This allows wires from the hub to enter the saddle body
        translate([0, -6.5, 0])
            rotate([0, 90, 0])
                cylinder(d=2.5, h=22, center=true);

        // Identification Marker (Engraved "L" or "R")
        translate([0, 8 - rounding_r, 0])
            rotate([90, 0, 0])
                mirror([is_left ? 0 : 1, 0, 0]) // Prevent backwards text on mirrored Right unit
                    linear_extrude(height = 1)
                        text(is_left ? "L" : "R", size = 7, halign = "center", valign = "center");

        // Tactile Identification Dots (1 for Left, 2 for Right)
        for(i = [0 : (is_left ? 0 : 1)]) {
            translate([(i*4)-2, 8 - rounding_r, -6])
                rotate([90, 0, 0])
                    sphere(d=1.5);
        }

        // Branding: "TRAHREG" engraved on the bottom face
        translate([0, 0, -10])
            linear_extrude(height = 1)
                text("TRAHREG", size = 2.5, halign = "center", valign = "center");
     }

    // --- Tapered Connecting Arm ---
    difference() {
        hull() {
            translate([6, 0, 0]) sphere(d=8);
            translate([14, 2, 0]) sphere(d=6);
        }
        // Groove along the arm to guide wires to the motor pod
        hull() {
            translate([6, -2, 0]) sphere(d=2.2);
            translate([14, 0, 0]) sphere(d=2.2);
        }
     }

    // --- Circular Motor Pod (Optimized for 10mm LRA) ---
    difference() {
        // Spherical housing for anatomical fit against mastoid
        translate([18, 4, 0]) 
            sphere(d=16);

        // Precision circular cavity for 10mm pancake motor
        translate([18, 6, 0])
            rotate([90, 0, 0])
                cylinder(d=10.6, h=4.2); // Added 0.1mm tolerance for motor fit
                
        // Wire exit relief (Subtracted to meet the arm groove)
        translate([16, 2, 0])
            sphere(d=3.5);
            
        // Flat face for efficient bone conduction transfer
        translate([18, 11, 0])
            cube([20, 10, 20], center=true);
    }

    // --- Mastoid Pressure Pad ---
    difference() {
        translate([24, 2, 0])
        hull() {
            sphere(d=10);
            translate([6, -2, 0]) sphere(d=6);
        }
        
        // Anti-Slip Texture (Micro-dimples on skin contact side)
        for (dx = [22:3:28], dz = [-3:3:3]) {
            translate([dx, 6.5, dz])
                sphere(d=1.2);
        }
    }

    // --- Anti-rotation Tab ---
    if (is_left) {
        translate([10, 6, 0])
            hull() {
                sphere(d=3);
                translate([0, 2, 4]) sphere(d=2);
            }
    }

    // --- Headband Wire Clip (Hub Wire Management) ---
    // Secures the main wire traveling along the headphone band
    translate([0, 6, 8])
    difference() {
        sphere(d=7);
        translate([0, 0, 1]) rotate([0, 90, 0]) cylinder(d=2.5, h=10, center=true);
        translate([0, 0, 4]) cube([10, 2, 6], center=true); // Entry slit
    }

    // --- Integrated Cable Relief ---
    translate([0, -5, -8])
    difference() {
        sphere(d=7);
        
        // S-Curve Cleat (Locks wire in place via friction)
        translate([-2, 0, 0]) rotate([0, 90, 0]) cylinder(d=2, h=10, center=true);
        translate([2, 1, 0]) rotate([0, 90, 0]) cylinder(d=2, h=10, center=true);
        
        translate([0, -4, 0]) cube([10, 5, 10], center=true);
    }
}

// Render Left and Right Pair
color("#00bfa5") {
    translate([-25, 0, 0]) saddle_v3(true);
}

color("#00897b") {
    translate([25, 0, 0]) mirror([1,0,0]) saddle_v3(false);
}