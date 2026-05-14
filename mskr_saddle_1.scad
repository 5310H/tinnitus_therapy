//
// MSKR Mastoid Saddle – Combined L + R
// OpenSCAD 2021‑compatible (no minkowski, no heavy fillets)
//

$fn = 48;

// ---------- Parameters ----------
saddle_len      = 20;
clip_inner_x    = 10.2;
clip_inner_y    = 9.6;
clip_wall       = 2.4;
clip_opening    = 4.0;

motor_pocket_d  = 10.3;
motor_pocket_h  = 3.2;

forward_offset  = 8.0;
preload         = 0.9;
tilt_deg        = 10;

wire_w          = 1.8;
wire_h          = 1.2;

letter_h        = 0.7;
letter_size     = 5;

pair_gap        = 15;


// ---------- Oval Clip (simple, 2021‑safe) ----------
module oval_clip(len) {
    difference() {
        // outer
        linear_extrude(len)
            scale([clip_inner_x/clip_inner_y, 1])
                circle(d = clip_inner_y + 2*clip_wall);

        // inner
        translate([0,0,-0.5])
        linear_extrude(len+1)
            scale([clip_inner_x/clip_inner_y, 1])
                circle(d = clip_inner_y);

        // opening
        translate([-clip_opening/2, -clip_inner_y, -0.5])
            cube([clip_opening, 2*clip_inner_y+1, len+1], center=false);
    }
}


// ---------- Wire Grooves ----------
module wire_groove(len) {
    translate([-len/2, -wire_w/2, -wire_h/2])
        cube([len, wire_w, wire_h], center=false);
}

module downward_groove(len_drop) {
    translate([-wire_w/2, -wire_w/2, -len_drop])
        cube([wire_w, wire_w, len_drop], center=false);
}


// ---------- Motor Cradle (simple, 2021‑safe) ----------
module motor_cradle_simple() {
    difference() {
        // ring
        rotate_extrude(angle=360)
            translate([motor_pocket_d/2, 0, 0])
                square([2, motor_pocket_h], center=false);

        // open inner side
        translate([-motor_pocket_d, 0, -1])
            cube([2*motor_pocket_d, motor_pocket_d, motor_pocket_h+2], center=false);
    }

    // simple retention lip
    translate([0,0,motor_pocket_h])
        cylinder(d=motor_pocket_d+1.0, h=0.6);
}


// ---------- Saddle ----------
module saddle(side="L") {

    // Clip body
    oval_clip(saddle_len);

    // Motor cradle
    translate([0,
               (clip_inner_y/2 + clip_wall) + preload,
               saddle_len/2 + forward_offset])
    rotate([tilt_deg, 0, 0])
        motor_cradle_simple();

    // Rear wire groove (~15mm)
    translate([0, -(clip_inner_y/2 + clip_wall + wire_h/2), saddle_len/2])
        wire_groove(15);

    // Left downward groove
    if (side == "L")
        translate([0, -(clip_inner_y/2 + clip_wall + wire_h/2), saddle_len/2])
            downward_groove(12);

    // L/R marking (text() works in 2021)
    translate([0, -(clip_inner_y/2 + clip_wall + 0.5), saddle_len/2])
    rotate([90,0,0])
    linear_extrude(letter_h)
        text(side, size=letter_size, halign="center", valign="center");
}


// ---------- Combined L + R ----------
translate([-(saddle_len + pair_gap/2), 0, 0])
    saddle("L");

translate([ (saddle_len + pair_gap/2), 0, 0])
    saddle("R");