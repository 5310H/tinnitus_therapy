//
// MSKR Mastoid Saddle – Combined L + R (Full Upgrades + Rounded)
// 440 parameters: 20mm length, 8mm forward offset, 0mm vertical offset,
//                 0.9mm preload, 10° inward tilt, VG1030001XH motor
//

// ---------- PARAMETERS ----------
saddle_len      = 20;
clip_inner_x    = 10.2;
clip_inner_y    = 9.6;
clip_wall       = 2.4;
clip_opening    = 4.0;
lip_inset       = 0.5;

motor_d         = 10.0;
motor_pocket_d  = 10.3;
motor_thick     = 3.0;
motor_pocket_h  = 3.2;

forward_offset  = 8.0;
vertical_offset = 0.0;
preload         = 0.9;
tilt_deg        = 10;

wire_w          = 1.8;
wire_h          = 1.2;

letter_h        = 0.7;
letter_size     = 5;

pair_gap        = 15;

fillet_r        = 0.8;   // global rounding radius


// ---------- ROUNDED HELPERS ----------
module rounded(obj) {
    minkowski() {
        obj();
        sphere(r=fillet_r, $fn=48);
    }
}

module rcube(size=[10,10,10]) {
    rounded(() => cube(size - [2*fillet_r,2*fillet_r,2*fillet_r], center=true));
}


// ---------- OVAL CLIP (ROUNDED) ----------
module smooth_clip(len) {
    rounded(() =>
        difference() {
            // outer shell
            linear_extrude(len)
                scale([clip_inner_x/clip_inner_y, 1])
                    circle(d = clip_inner_y + 2*clip_wall, $fn=96);

            // inner cavity
            translate([0,0,-1])
            linear_extrude(len+2)
                scale([clip_inner_x/clip_inner_y, 1])
                    circle(d = clip_inner_y, $fn=96);

            // opening cut
            translate([-clip_opening/2, -clip_inner_y, -1])
                cube([clip_opening, 2*clip_inner_y+2, len+2], center=false);
        }
    );
}


// ---------- WIRE GROOVES ----------
module smooth_wire_groove(len) {
    rounded(() => cube([len, wire_w, wire_h], center=true));
}

module smooth_downward_groove(len_drop) {
    rounded(() => cube([wire_w, wire_w, len_drop], center=true));
}


// ---------- MOTOR CRADLE (FULL UPGRADE) ----------
module motor_cradle_upgraded() {

    difference() {

        // Base cradle (rounded)
        rounded(() =>
            rotate_extrude(angle=360, $fn=96)
                translate([motor_pocket_d/2, 0, 0])
                    square([2, motor_pocket_h], center=false)
        );

        // Open inner side
        translate([-motor_pocket_d, 0, -1])
            cube([2*motor_pocket_d, motor_pocket_d, motor_pocket_h+2], center=false);

        // Motor insertion slot
        translate([-motor_pocket_d/2, motor_pocket_d/2 - 1.4, -1])
            cube([motor_pocket_d, 1.4, motor_pocket_h+2], center=false);
    }

    // Dual‑lip retention
    translate([0,0,motor_pocket_h])
        rounded(() => cylinder(d=motor_pocket_d+1.2, h=0.6, $fn=64));

    translate([0,0,motor_pocket_h+0.6])
        rounded(() => cylinder(d=motor_pocket_d+0.6, h=0.6, $fn=64));

    // Anti‑rotation tabs
    for (a=[45,315])
        rotate([0,0,a])
            translate([motor_pocket_d/2,0,motor_pocket_h/2])
                rcube([1.2,0.6,1.2]);

    // TPU shock‑ring groove
    translate([0,0,motor_pocket_h/2])
        difference() {
            cylinder(d=motor_pocket_d+0.4, h=0.3, $fn=64);
            cylinder(d=motor_pocket_d-0.4, h=0.3, $fn=64);
        }
}


// ---------- FULL SADDLE ----------
module saddle(side="L") {

    // Clip
    smooth_clip(saddle_len);

    // Motor cradle position
    translate([0,
               (clip_inner_y/2 + clip_wall) + preload,
               saddle_len/2 + forward_offset])
    rotate([tilt_deg, 0, 0])
        motor_cradle_upgraded();

    // Rear wire groove
    translate([0, -(clip_inner_y/2 + clip_wall + wire_h/2), saddle_len/2])
        smooth_wire_groove(15);

    // Left downward groove
    if (side == "L")
        translate([0, -(clip_inner_y/2 + clip_wall + wire_h/2), saddle_len/2])
            smooth_downward_groove(12);

    // L/R marking
    translate([0, -(clip_inner_y/2 + clip_wall + 0.5), saddle_len/2])
    rotate([90,0,0])
    linear_extrude(letter_h)
        text(side, size=letter_size, halign="center", valign="center");
}


// ---------- COMBINED L + R ----------
translate([-(saddle_len + pair_gap/2), 0, 0])
    saddle("L");

translate([ (saddle_len + pair_gap/2), 0, 0])
    saddle("R");