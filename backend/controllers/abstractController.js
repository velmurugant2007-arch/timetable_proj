const { supabase } = require('../config/db');

exports.getAbstractData = async (req, res, next) => {
  try {
    const { data: dbMasterTT } = await supabase.from('faculty_master_tt').select('*').eq('id', 1).single();
    const { data: dbSubjects } = await supabase.from('subjects').select('*');

    if (!dbMasterTT || !dbMasterTT.faculty || dbMasterTT.faculty.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    
    const abstractList = dbMasterTT.faculty.map((fac, idx) => {
      let theoryW = 0;
      let theoryS = 0;
      let practical = 0;
      let tutorial = 0;
      let placement = 0;

      if (fac.schedule) {
        for (const day of DAYS) {
          let p = 1;
          while (p <= 7) {
            const cell = fac.schedule[day] && fac.schedule[day][p];
            if (cell && cell.raw) {
               let blockLength = 1;
               let nextP = p + 1;
               while (nextP <= 7 && fac.schedule[day][nextP] && fac.schedule[day][nextP].subjectCode === cell.subjectCode) {
                 blockLength++;
                 nextP++;
               }
               
               const code = cell.subjectCode.toUpperCase();
               const dbSubj = dbSubjects && dbSubjects.find(s => s.code === cell.subjectCode);
               const isLab = (dbSubj && dbSubj.isLab) || blockLength > 1;

               if (code.includes('PLAC') || code.includes('SEM')) placement += blockLength;
               else if (code.includes('TUTORIAL') || code.includes('TUT')) tutorial += blockLength;
               else if (isLab) practical += blockLength;
               else {
                 if (day === 'SATURDAY') theoryS += blockLength;
                 else theoryW += blockLength;
               }
               p += blockLength;
            } else {
               p++;
            }
          }
        }
      }

      let isLeave = fac.isMedicalLeave || (fac.remarks && fac.remarks.toUpperCase().includes('LEAVE'));
      let isRelieved = fac.remarks && fac.remarks.toUpperCase().includes('RELIEVED');

      let a1 = theoryW;
      let a2 = theoryS;
      let b = practical;
      let c = tutorial;
      let d = placement;

      let contactHours = a1 + a2 + b + c + d;
      let totalWorkload = a1 + ((a2 + b + c + d) / 2);

      return {
        sNo: idx + 1,
        name: fac.fullName || fac.acronym,
        designation: fac.designation || 'Faculty',
        theoryW: a1 > 0 ? a1 : '',
        theoryS: a2 > 0 ? a2 : '',
        practical: b > 0 ? b : '',
        tutorial: c > 0 ? c : '',
        placement: d > 0 ? d : '',
        contactHours: contactHours > 0 ? contactHours : '',
        totalWorkload: totalWorkload > 0 ? totalWorkload : '',
        isLeave,
        isRelieved,
        remarks: fac.remarks || ''
      };
    });

    res.status(200).json({ success: true, data: abstractList });
  } catch (err) { next(err); }
};
