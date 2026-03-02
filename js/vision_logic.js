class GestureRecognizer {
    constructor(holdTime = 0.5) {
        /*
        holdTime: How long (in seconds) a gesture must be held before it triggers.
        0.5 seconds is usually the sweet spot for a hackathon demo.
        */
        this.holdTime = holdTime;
        
        // State trackers for temporal smoothing
        this.stableDomain = "neutral";       // What is currently displaying on screen
        this.candidateDomain = "neutral";    // What the current frame thinks it sees
        this.candidateStartTime = performance.now() / 1000;

        // --- TIMER ---
        this.lastTriggerTime = 0;            // Stores the timestamp of when a domain was locked in
        this.timeoutDuration = 10.0;         // 10 seconds reset
    }

    // --- HELPER FUNCTION ---
    // Converts MediaPipe JS normalized coords (0-1) to pixel coordinates to match Python logic
    static getPixelLandmarks(landmarks, width, height) {
        return landmarks.map(lm => ({
            x: lm.x * width,
            y: lm.y * height,
            z: lm.z
        }));
    }

    static isFingerExtended(tip, pip, wrist) {
        const distTip = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
        const distPip = Math.hypot(pip.x - wrist.x, pip.y - wrist.y);
        return distTip > distPip;
    }

    static detectInfiniteVoid(hand) {
        const lm = hand.landmarks;
        const wrist = lm[0];
        
        const indexTip = lm[8], indexPip = lm[6];
        const middleTip = lm[12], middlePip = lm[10];
        const ringTip = lm[16], ringPip = lm[14];
        const pinkyTip = lm[20], pinkyPip = lm[18];

        const indexExt = GestureRecognizer.isFingerExtended(indexTip, indexPip, wrist);
        const middleExt = GestureRecognizer.isFingerExtended(middleTip, middlePip, wrist);
        const ringExt = GestureRecognizer.isFingerExtended(ringTip, ringPip, wrist);
        const pinkyExt = GestureRecognizer.isFingerExtended(pinkyTip, pinkyPip, wrist);

        if (indexExt && middleExt && !ringExt && !pinkyExt) {
            const indexMcp = lm[5], middleMcp = lm[9];
            const knuckleDist = Math.hypot(indexMcp.x - middleMcp.x, indexMcp.y - middleMcp.y);
            const tipDist = Math.hypot(indexTip.x - middleTip.x, indexTip.y - middleTip.y);
            
            if (tipDist < (knuckleDist * 1.2)) { 
                return true;
            }
        }
        return false;
    }

    static detectMalevolentShrine(hand1, hand2) {
        const lm1 = hand1.landmarks;
        const lm2 = hand2.landmarks;
        const wrist1 = lm1[0], wrist2 = lm2[0];

        const handSize = Math.hypot(lm1[9].x - wrist1.x, lm1[9].y - wrist1.y); 
        
        const mid1Ext = GestureRecognizer.isFingerExtended(lm1[12], lm1[10], wrist1);
        const mid2Ext = GestureRecognizer.isFingerExtended(lm2[12], lm2[10], wrist2);

        if (!(mid1Ext && mid2Ext)) return false;

        const midTip1 = lm1[12], midTip2 = lm2[12];
        const midTipDist = Math.hypot(midTip1.x - midTip2.x, midTip1.y - midTip2.y);

        if (midTipDist < (handSize * 0.8)) { 
            return true;
        }
        return false;
    }

    static detectAuthenticMutualLove(hand1, hand2) {
        const lm1 = hand1.landmarks, lm2 = hand2.landmarks;
        const wrist1 = lm1[0], wrist2 = lm2[0];

        const wristDist = Math.hypot(wrist1.x - wrist2.x, wrist1.y - wrist2.y);
        const handSize = Math.hypot(lm1[9].x - wrist1.x, lm1[9].y - wrist1.y); 

        if (wristDist < (handSize * 2.0)) return false;

        const isFist = (lm, wrist) => {
            return !(GestureRecognizer.isFingerExtended(lm[8], lm[6], wrist) ||
                     GestureRecognizer.isFingerExtended(lm[12], lm[10], wrist) ||
                     GestureRecognizer.isFingerExtended(lm[16], lm[14], wrist) ||
                     GestureRecognizer.isFingerExtended(lm[20], lm[18], wrist));
        };

        const isFlat = (lm, wrist) => {
            return (GestureRecognizer.isFingerExtended(lm[8], lm[6], wrist) &&
                    GestureRecognizer.isFingerExtended(lm[12], lm[10], wrist) &&
                    GestureRecognizer.isFingerExtended(lm[16], lm[14], wrist) &&
                    GestureRecognizer.isFingerExtended(lm[20], lm[18], wrist));
        };

        if ((isFist(lm1, wrist1) && isFlat(lm2, wrist2)) || (isFlat(lm1, wrist1) && isFist(lm2, wrist2))) {
            return true;
        }
        return false;
    }

    static detectIdleDeathGamble(hand1, hand2) {
        const lm1 = hand1.landmarks, lm2 = hand2.landmarks;
        const wrist1 = lm1[0], wrist2 = lm2[0];

        const handSize = Math.hypot(lm1[9].x - wrist1.x, lm1[9].y - wrist1.y); 
        const wristDist = Math.hypot(wrist1.x - wrist2.x, wrist1.y - wrist2.y);

        if (wristDist < (handSize * 0.8)) return false;

        const isHakariHand = (lm, wrist) => {
            const midExt = GestureRecognizer.isFingerExtended(lm[12], lm[10], wrist);
            const ringExt = GestureRecognizer.isFingerExtended(lm[16], lm[14], wrist);
            const pinkyExt = GestureRecognizer.isFingerExtended(lm[20], lm[18], wrist);
            
            if (!(midExt && ringExt && pinkyExt)) return false;
                
            const thumbTip = lm[4], indexTip = lm[8];
            const ringDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
            const localHandSize = Math.hypot(lm[9].x - wrist.x, lm[9].y - wrist.y);
            
            if (ringDist < (localHandSize * 0.4)) return true;
            return false;
        };

        if (isHakariHand(lm1, wrist1) && isHakariHand(lm2, wrist2)) return true;
        return false;
    }

    static detectChimeraShadowGarden(detectedHands) {
        if (detectedHands.length < 2) return false;

        const lm1 = detectedHands[0].landmarks, lm2 = detectedHands[1].landmarks;
        const wrist1 = lm1[0], wrist2 = lm2[0];

        const handSize = Math.hypot(lm1[9].x - wrist1.x, lm1[9].y - wrist1.y);
        const wristDist = Math.hypot(wrist1.x - wrist2.x, wrist1.y - wrist2.y);

        if (wristDist > (handSize * 3.5)) return false;

        for (const hand of [detectedHands[0], detectedHands[1]]) {
            const lm = hand.landmarks;
            const wrist = lm[0];
            const indexExt = GestureRecognizer.isFingerExtended(lm[8], lm[6], wrist);
            const midExt = GestureRecognizer.isFingerExtended(lm[12], lm[10], wrist);
            const ringExt = GestureRecognizer.isFingerExtended(lm[16], lm[14], wrist);
            const pinkyExt = GestureRecognizer.isFingerExtended(lm[20], lm[18], wrist);

            if (!(indexExt && pinkyExt && !midExt && !ringExt)) return false;
        }
        return true;
    }

    static detectSelfEmbodimentOfPerfection(hand1, hand2) {
        const lm1 = hand1.landmarks, lm2 = hand2.landmarks;
        const wrist1 = lm1[0], wrist2 = lm2[0];

        const handSize = Math.hypot(lm1[9].x - wrist1.x, lm1[9].y - wrist1.y);
        const wristDist = Math.hypot(wrist1.x - wrist2.x, wrist1.y - wrist2.y);

        if (wristDist < (handSize * 1.2)) return false;

        const tips = [4, 8, 12, 16, 20]; 
        for (const tip of tips) {
            const tipDist = Math.hypot(lm1[tip].x - lm2[tip].x, lm1[tip].y - lm2[tip].y);
            if (tipDist > (handSize * 0.9)) return false;
        }

        const midToWrist = Math.hypot(lm1[12].x - wrist1.x, lm1[12].y - wrist1.y);
        if (midToWrist < handSize) return false; 

        return true;
    }

    static detectDeadlySentencing(hand) {
        const lm = hand.landmarks;
        const wrist = lm[0];

        const indexExt = GestureRecognizer.isFingerExtended(lm[8], lm[6], wrist);
        const middleExt = GestureRecognizer.isFingerExtended(lm[12], lm[10], wrist);
        const ringExt = GestureRecognizer.isFingerExtended(lm[16], lm[14], wrist);
        const pinkyExt = GestureRecognizer.isFingerExtended(lm[20], lm[18], wrist);

        if (indexExt || middleExt || ringExt || pinkyExt) return false;

        const thumbTip = lm[4];
        const indexMcp = lm[5];
        
        const handSize = Math.hypot(lm[9].x - wrist.x, lm[9].y - wrist.y);
        const thumbDist = Math.hypot(thumbTip.x - indexMcp.x, thumbTip.y - indexMcp.y);

        if (thumbDist > (handSize * 1.2)) return false;

        return true;
    }

    static detectSummonMahoraga(hand1, hand2) {
        const lm1 = hand1.landmarks, lm2 = hand2.landmarks;
        const wrist1 = lm1[0], wrist2 = lm2[0];

        const wristDist = Math.hypot(wrist1.x - wrist2.x, wrist1.y - wrist2.y);
        const handSize = Math.hypot(lm1[9].x - wrist1.x, lm1[9].y - wrist1.y); 

        if (wristDist < (handSize * 2.0)) return false;

        const isTightFist = (lm, wrist) => {
            const curled = !(GestureRecognizer.isFingerExtended(lm[8], lm[6], wrist) ||
                             GestureRecognizer.isFingerExtended(lm[12], lm[10], wrist) ||
                             GestureRecognizer.isFingerExtended(lm[16], lm[14], wrist) ||
                             GestureRecognizer.isFingerExtended(lm[20], lm[18], wrist));
            
            const thumbTip = lm[4], indexMcp = lm[5];
            const thumbDist = Math.hypot(thumbTip.x - indexMcp.x, thumbTip.y - indexMcp.y);
            const thumbWrapped = thumbDist < (handSize * 1.2);

            return curled && thumbWrapped;
        };

        if (isTightFist(lm1, wrist1) && isTightFist(lm2, wrist2)) return true;
        return false;
    }

    _getRawDomain(detectedHands) {
        if (!detectedHands || detectedHands.length === 0) return "neutral";

        if (GestureRecognizer.detectChimeraShadowGarden(detectedHands)) return "chimera_shadow_garden";

        if (detectedHands.length >= 2) {
            if (GestureRecognizer.detectSummonMahoraga(detectedHands[0], detectedHands[1])) return "summon_mahoraga";
            if (GestureRecognizer.detectSelfEmbodimentOfPerfection(detectedHands[0], detectedHands[1])) return "self_embodiment_of_perfection";
            if (GestureRecognizer.detectMalevolentShrine(detectedHands[0], detectedHands[1])) return "malevolent_shrine";
            if (GestureRecognizer.detectAuthenticMutualLove(detectedHands[0], detectedHands[1])) return "authentic_mutual_love";
            if (GestureRecognizer.detectIdleDeathGamble(detectedHands[0], detectedHands[1])) return "idle_death_gamble";
        }

        for (const hand of detectedHands) {
            if (GestureRecognizer.detectInfiniteVoid(hand)) return "infinite_void";
            if (GestureRecognizer.detectDeadlySentencing(hand)) return "deadly_sentencing";
        }

        return "neutral";
    }

    // --- MAIN ENGINE LOOP ---
    // Takes MediaPipe JS output directly, maps coordinates, and runs logic
    getDomainExpansion(multiHandLandmarks, videoWidth = 640, videoHeight = 480) {
        
        const detectedHands = multiHandLandmarks.map(landmarks => ({
            landmarks: GestureRecognizer.getPixelLandmarks(landmarks, videoWidth, videoHeight)
        }));

        const rawDomain = this._getRawDomain(detectedHands);
        const now = performance.now() / 1000;
        let currentProgress = 0.0; // Tracks the cursed energy buildup

        // Smoothing & Buildup Logic
        if (rawDomain === this.candidateDomain && rawDomain !== "neutral") {
            const timeHeld = now - this.candidateStartTime;
            currentProgress = Math.min(1.0, timeHeld / this.holdTime);
            
            if (timeHeld >= this.holdTime) {
                if (this.stableDomain !== rawDomain) {
                    this.stableDomain = rawDomain;
                    this.lastTriggerTime = now; 
                }
            }
        } else {
            this.candidateDomain = rawDomain;
            this.candidateStartTime = now;
            currentProgress = 0.0;
        }

        // Auto-Reset Logic
        if (this.stableDomain !== "neutral") {
            const elapsedSinceTrigger = now - this.lastTriggerTime;
            currentProgress = 1.0; // Keep meter full while domain is active
            
            if (elapsedSinceTrigger > this.timeoutDuration) {
                this.stableDomain = "neutral";
                console.log(`Domain ${this.stableDomain} timed out. Resetting.`);
                currentProgress = 0.0;
            }
        }

        // Return BOTH the domain string and the buildup percentage
        return { domain: this.stableDomain, progress: currentProgress };
    }
}