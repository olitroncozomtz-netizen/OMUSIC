const videos = [
    {
        title: "PIENSO EN TI.",
        url: "https://res.cloudinary.com/dgdoakzy1/video/upload/v1779763939/Alvaro_Diaz_-_PIENSO_EN_TI._WqOltkebsIs_td7bzr.webm",
        artist:"Alvaro Díaz",
        cover: "https://i.ytimg.com/vi/WqOltkebsIs/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLCb2YCkn5yWh_Wb6cqW9QH-3TJtAg"
    },
    {
        title: "MALASNOTICIAS.",
        url: "https://res.cloudinary.com/dgdoakzy1/video/upload/v1777763660/Alvaro_Diaz_LATIN_MAFIA_-_MALAS_NOTICIAS_Official_Video_jr1uuz.mp4",
        artist:"Alvaro Díaz, Latin Mafia",
        cover: "https://i.ytimg.com/vi/euurUq0YNbk/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLCG-FNpY8mSSG4odC1W8Ea_YIElyg"
    },
    {
        title: "chiclona",
        url: "https://res.cloudinary.com/dgdoakzy1/video/upload/v1777844531/chiclona_-_Peso_Pluma_Tito_Double_P_LENCHO_Video_Oficial_xx6bjp.mp4",
        artist:"Lencho, Peso Pluma, Tito Doble P",
        cover: "https://i.ytimg.com/vi_webp/px5DTq4Ks4A/maxresdefault.webp"
    },
    {
        title: "MI GATA",
        url: "https://res.cloudinary.com/dgdoakzy1/video/upload/v1777345666/Junior_H_x_Gael_Valenzuela_-_MI_GATA_Official_Video_skihdm.mp4",
        artist:"Junior h, Gael Valenzuela",
        cover: "https://i.ytimg.com/vi/QcSk1JMF2y0/maxresdefault.jpg"
    },
    {
        title: "VALLE DE $OMBRA$",
        url: "https://res.cloudinary.com/dgdoakzy1/video/upload/v1778815285/Junior_H_x_Gael_Valenzuela_-_VALLE_DE_OMBRA_Official_Video_lsljsn.mkv",
        artist:"Junior h, Gael Valenzuela",
        cover: "https://i.ytimg.com/vi/XZYSbl5j2iw/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLAHiIV7yK7ooW-lcOFraObCdYQ6Ww"
    },
    {
        title: "ERRORE$",
        url: "https://res.cloudinary.com/dgdoakzy1/video/upload/v1777763689/Junior_H_x_Gael_Valenzuela_-_ERRORE_Official_Video_mxnzuw.mp4",
        artist:"Junior H, Gael Valenzuela",
        cover: "https://i.ytimg.com/vi/EiDKvKC9gwE/maxresdefault.jpg"
    },
    {
        title: "CANASTEO",
        url: "https://res.cloudinary.com/dgdoakzy1/video/upload/v1778815292/Canasteo_-_R%C3%A9gulo_Molina_Oscar_Maydon_y_Net%C3%B3n_Vega_Video_oficial_h0avx2.mp4",
        artist:"Régulo Molina, Netón Vega, Óscar Maydon",
        cover: "https://i.ytimg.com/vi/I0r1lTbHawE/mqdefault.jpg?v=696b17fc"
    },
    {
        title: "sobelove",
        url: "",
        artist:"Beéle",
        cover: "https://i.ytimg.com/vi/dIUX2IfPR8M/maxresdefault.jpg"
    },
    {
        title: "VOY A DISPARARME",
        url: "https://res.cloudinary.com/dgdoakzy1/video/upload/v1777345665/LITTLE_BOOGIE_MILO_J_-_VOY_A_DISPARARME_VIDEOCLIP_OFICIAL_zb1nu2.mp4",
        artist:"Milo j, LITTLE BOOGIE",
        cover: "https://img.youtube.com/vi/WJnWMW8uf6o/maxresdefault.jpg"
    },
    {
        title: "Niño",
        url: "https://res.cloudinary.com/dgdoakzy1/video/upload/v1777345657/Milo_J_-_Ni%C3%B1o_Official_Video_sngdoc.mp4",
        artist:"Milo j",
        cover: "https://i.ytimg.com/vi_webp/Lg2UXs9SDx4/maxresdefault.webp"
    },
    {
        title: "Gil (Visualizer)",
        url: "https://res.cloudinary.com/dgdoakzy1/video/upload/v1777345602/Milo_J_Trueno_-_Gil_Visualizer_bijd7f.mp4",
        artist:"Milo j, Trueno",
        cover: "https://i.ytimg.com/vi/2ezVj9wLr5U/sddefault.jpg"
    },
    {
        title: "Khé?",
        url: "https://res.cloudinary.com/dgdoakzy1/video/upload/v1777344609/Rauw_Alejandro_Romeo_Santos_-_Kh%C3%A9_Official_Video_n7jo8v.mp4",
        artist:"Rauw Alejandro, Romeo Santos",
        cover: "https://i.ytimg.com/vi/J8U9czVT7tM/maxresdefault.jpg"
    },
    {
        title: "WE LOVE THAT SHIT",
        url: "https://res.cloudinary.com/dgdoakzy1/video/upload/v1778728601/Nicki_Nicole_Khea_-_WE_LOVE_THAT_SHIT_Video_Oficial_pcatr6.mp4",
        artist:"Khea, Nicki Nicole",
        cover: "https://i.ytimg.com/vi/y6WL9xjRw6w/maxresdefault.jpg"
    },
    {
        title: "Golfista",
        url: "https://res.cloudinary.com/dgdoakzy1/video/upload/v1777763690/DUKI_-_Golfista_Video_Oficial_y5drll.mp4",
        artist:"Duki",
        cover: "https://i.ytimg.com/vi/tsNUuGteXVk/maxresdefault.jpg"
    },
    {
        title: "WIFE MATERIAL (Video Oficial)",
        url: "https://res.cloudinary.com/dgdoakzy1/video/upload/v1777345632/Young_Cister_Rvfv_-_WIFE_MATERIAL_Video_Oficial_ytbclz.mp4",
        artist:"Young Cister, Rvfv",
        cover: "https://lyricsraag.com/wp-content/uploads/2026/03/wife-material-la-ciudad-nunca-duerme-translation.webp"
    },
    {
        title: "ZUNDADA DE FONDO",
        url: "https://res.cloudinary.com/dgdoakzy1/video/upload/v1777175069/EASYKID_-_ZUNDADA_DE_FONDO_ft._FACEBROOKLYN_ouoyh5.mp4",
        artist:"Easykid, FACEBROOKLYN",
        cover: "https://i.ytimg.com/vi/uDLFrtZ6Uf4/maxresdefault.jpg"
    },
    {
        title: "SHINY",
        url: "https://res.cloudinary.com/dgdoakzy1/video/upload/v1777175133/EASYKID_-_SHINY_bxkmdc.mp4",
        artist:"Easykid",
        cover: "https://i.ytimg.com/vi/SmFsXCEiGQA/maxresdefault.jpg"
    },
    {
        title: "Priti",
        url: "https://res.cloudinary.com/dgdoakzy1/video/upload/v1777762447/Danny_Ocean_x_Sech_-_Priti_SHORT_VIDEO_6uGNPIvgVQ4_gpfulu.mkv",
        artist:"Danny Ocean, Sech",
        cover: "https://i.ytimg.com/vi/HF5hT2qszzI/maxresdefault.jpg"
    },
    {
        title: "L.O.V.E.U (Official Music Video)",
        url: "https://res.cloudinary.com/dgdoakzy1/video/upload/v1777669895/d4vd_hannah_bahng_-_L.O.V.E.U_Official_Music_Video_mve1qn.mp4",
        artist:"d4vd, hannah bahng",
        cover: "https://res.cloudinary.com/dgdoakzy1/image/upload/v1777669852/D4VD-L.O.V.E.U-FT.-HANNAH-BAHNG-photo_yrbrjk.jpg"
    },
    {
        title: "PIEL",
        url: "https://res.cloudinary.com/dgdoakzy1/video/upload/v1777175260/nsqk_-_piel_gfl35l.mp4",
        artist:"Nsqk" ,
        cover: "https://i.ytimg.com/vi/qIREvMVx3bQ/maxresdefault.jpg"
    },
    {
        title: "Nueva Era",
        url: "https://res.cloudinary.com/dgdoakzy1/video/upload/v1778728600/DUKI_Myke_Towers_-_Nueva_Era_nrr77f.mkv",
        artist:"Duki, Myke Towers",
        cover: "https://i.ytimg.com/vi/wgvqiH7iCRo/sddefault.jpg?v=672405df"
    },
    {
        title: "Hardaway",
        url: "https://res.cloudinary.com/dgdoakzy1/video/upload/v1777345656/DUKI_YG_Eladio_Carri%C3%B3n_-_Hardaway_c0rt83.mp4",
        artist:"Duki, YG, Eladio Carrión",
        cover: "https://i.ytimg.com/vi/pCSaR_-i_pY/maxresdefault.jpg"
    },
    {
        title: "GRAN VÍA",
        url: "https://upcdn.io/kW2K8s8/raw/GRAN%20V%C3%8DA%20-%20Quevedo%20ft.%20Aitana%20(Official%20Video).mkv",
        artist:"Quevedo, Aitana",
        cover: "https://i.ytimg.com/vi/WsmJ2P3fCkw/maxresdefault.jpg"
    },
    {
        title: "RIP PETE",
        url: "https://res.cloudinary.com/dgdoakzy1/video/upload/v1778815302/nsqk_-_RIP_PETE_Visualizer_c9mmdd.mkv",
        artist:"Nsqk" ,
        cover: "https://i.scdn.co/image/ab6742d3000053b704a6b0720a4188c49918b651"
    },
    {
        title: "BOBOMENSOTONTO",
        url: "https://res.cloudinary.com/dgdoakzy1/video/upload/v1777175388/nsqk_Easykid_-_BOBOMENSOTONTO_Visualizer_nmkrbn.mp4",
        artist:"Nsqk, Easykid" ,
        cover: "https://i.ytimg.com/vi/fxlJLrw4OEs/maxresdefault.jpg"
    },
    {
        title: "los alpes (Visualizer)",
        url: "https://res.cloudinary.com/dgdoakzy1/video/upload/v1777345636/nsqk_Nina_-_los_alpes_Visualizer_fogkdi.mp4",
        artist:"Nsqk, Nina" ,
        cover: "https://i.ytimg.com/vi/wyf7Oheb62Q/maxresdefault.jpg"
    },
    {
        title: "COMETIERRA REMIX",
        url: "https://res.cloudinary.com/dgdoakzy1/video/upload/v1777175365/nsqk_legallyrxx_-_COMETIERRA_REMIX_Video_oficial_lueonz.mp4",
        artist: "Nsqk",
        cover: "https://i.ytimg.com/vi/9lRmvMZ4T6g/sddefault.jpg?v=656f5b7a"
    },
    {
        title:"YOKO",
        url: "https://res.cloudinary.com/dgdoakzy1/video/upload/v1777847585/Alvaro_Diaz_-_Yoko_Official_Video_h1oxby.mp4",
        artist:"Alvario Díaz",
        cover: "https://i.ytimg.com/vi/T89IqbAF9Ik/maxresdefault.jpg"
    },
    {
        title:"PLN",
        url: "https://res.cloudinary.com/dgdoakzy1/video/upload/v1779763963/Alvaro_Diaz_-_PLN_Official_Video_xQXrt0gAM6E_qf9eae.mp4",
        artist:"Alvario Díaz",
        cover: "https://i.ytimg.com/vi/xQXrt0gAM6E/sddefault.jpg"
    },
    {
        title:"Ramona Flowers",
        url: "https://res.cloudinary.com/dgdoakzy1/video/upload/v1777344601/Alvaro_Diaz_-_Ramona_Flowers_Official_Video_oyrrrz.mp4",
        artist:"Alvario Díaz",
        cover: "https://i.ytimg.com/vi/fz68KFMj3Ok/maxresdefault.jpg"
    },
    {
        title: "QUIZAS SI QUIZAS NO",
        url: "https://res.cloudinary.com/dgdoakzy1/video/upload/v1777175114/Alvaro_Diaz_Quevedo_-_QUIZAS_SI_QUIZAS_NO_Official_Video_vojqfr.mp4",
        artist:"Alvaro Díaz, Quevedo",
        cover: "https://i.ytimg.com/vi/Xi-Dn4s9cLQ/maxresdefault.jpg"
    },
    {
        title: "3 PECADOS DESPUES",
        url: "https://res.cloudinary.com/dgdoakzy1/video/upload/v1777341060/MILO_J_-_3_PECADOS_DESPUES..._Video_Oficial_h9wl6k.mp4",
        artist:"Milo j" ,
        cover: "https://img.youtube.com/vi/3BdTNRISww0/maxresdefault.jpg"
    },
    {
        title: "BESAME REMIX",
        url: "https://res.cloudinary.com/dgdoakzy1/video/upload/v1777344618/BESAME_REMIX_-_BHAVI_SEVEN_KAYNE_MILO_J_TIAGO_PZK_KHEA_NEO_PISTEA_twpycr.mp4",
        artist:"Bhavi, Seven Kayne, Milo j, Tiago Pzk, Khea, Neo Pistea",
        cover: "https://i.ytimg.com/vi/9hxzmqpnGb0/maxresdefault.jpg"
    },
    {
        title: "UNA BALA",
        url: "https://res.cloudinary.com/dgdoakzy1/video/upload/v1778728598/MILO_J_-_UNA_BALA_ft._Peso_Pluma_Video_Oficial_ohryuq.mp4",
        artist:"Milo j, Peso Pluma",
        cover: "https://i.ytimg.com/vi/-KK0gXX36J0/maxresdefault.jpg"
    },
    {
        title: "RARA VEZ",
        url: "https://res.cloudinary.com/dgdoakzy1/video/upload/v1778728861/MILO_J_-_RARA_VEZ_Prod._Taiu_1_fykjkm.mp4",
        artist:"Milo j",
        cover: "https://i.ytimg.com/vi/sxPcobu7qbo/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLAEXDT0EnhLggcHpH4u8m5ueSu4zQ"
    },
    {
        title: "Feel it",
        url: "https://res.cloudinary.com/dgdoakzy1/video/upload/v1778730586/D4vd_-_Feel_It_Official_Music_Video_fhvuoz.mp4",
        artist:"d4vd",
        cover: "https://i.ytimg.com/vi/vZi8ET9k11g/maxresdefault.jpg"
    },
    {
        title: "Where'd It Go Wrong?",
        url: "https://res.cloudinary.com/dgdoakzy1/video/upload/v1777345678/d4vd_-_Where_d_It_Go_Wrong_Official_Music_Video_hyevb0.mp4",
        artist:"d4vd",
        cover: "https://i.ytimg.com/vi/Ewk2CygtBV4/maxresdefault.jpg"
    },
    {
        title: "Remember Me",
        url: "https://res.cloudinary.com/dgdoakzy1/video/upload/v1778729256/DUKI_KHEA_Bizarrap_-_Remember_Me_Video_Oficial_hlnw9z.mkv",
        artist:"Duki, Khea, Bizarrap ",
        cover: "https://i.ytimg.com/vi/YpjTBOm2xt4/maxresdefault.jpg"
    },
    {
        title: "MOJABI GHOST",
        url: "https://res.cloudinary.com/dgdoakzy1/video/upload/v1777175224/MOJABI_GHOST_-_Tainy_Bad_Bunny_rmgzc9.mp4",
        artist:"Tainy, Bad Bunny",
        cover: "https://i.ytimg.com/vi/O1wUdB7MQbI/maxresdefault.jpg"
    },
    {
        title: "SCI-FI",
        url: "https://res.cloudinary.com/dgdoakzy1/video/upload/v1777344636/Tainy_Rauw_Alejandro_-_SCI-FI_Official_Video_vryn2d.mp4",
        artist:"Tainy, Rauw Alejandro",
        cover: "https://i.ytimg.com/vi/_dFjJmJdJjY/maxresdefault.jpg"
    },
    {
        title: "COLMILLO",
        url: "https://res.cloudinary.com/dgdoakzy1/video/upload/v1777344639/COLMILLO_-_Tainy_J_Balvin_Young_Miko_Jowell_Randy_Music_Video_khxvnq.mp4",
        artist:"Tainy, J Balvin",
        cover: "https://i.ytimg.com/vi/HkG1m9sSojI/maxresdefault.jpg"
    },
    {
        title: "CORAZÓN FRÍO",
        url: "https://upcdn.io/kW2K8s8/raw/Coraz%C3%B3n%20Fr%C3%ADo%20(Video%20Oficial)%20-%20Jasiel%20Nu%C3%B1ez%2C%20DannyLux.mkv",
        artist:"Jasiel Nuñez, DannyLux",
        cover: "https://i.ytimg.com/vi/oslJpKmdX20/maxresdefault.jpg"
    },
    {
        title: "SE ME OLVIDA",
        url: "https://res.cloudinary.com/dgdoakzy1/video/upload/v1777762448/Feid_Maisak_-_SE_ME_OLVIDA_Official_Video_ROgcM9-N9jM_fagsvy.mp4",
        artist:"Feid, Maisak",
        cover: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS322dqYj7Xov0P8LeF5Z2EPwy6z_VsE3sxZw&s"
    },
    {
        title: "Columbia",
        url: "https://res.cloudinary.com/dgdoakzy1/video/upload/v1778815258/Columbia_-_Quevedo_Video_Oficial_ck7ynr.mkv",
        artist:"Quevedo",
        cover: "https://i.ytimg.com/vi/QlZNGcVfeF0/maxresdefault.jpg"
    },
    {
        title: "Dame",
        url: "https://res.cloudinary.com/dgdoakzy1/video/upload/v1778728596/7._DAME_-_Quevedo_Omar_Montes_DONDE_QUIERO_ESTAR_p7nqnx.mkv",
        artist:"Quevedo",
        cover: "https://img.youtube.com/vi/4xho557CaCg/maxresdefault.jpg"
    },
    {
        title: "Tiroteo Remix",
        url: "https://res.cloudinary.com/dgdoakzy1/video/upload/v1777762581/Marc_Segu%C3%AD_-_Tiroteo_Remix_ft._Rauw_Alejandro_y_Pol_Granch_Videoclip_Oficial_VEfkNHTjgs8_sqj19a.mp4",
        artist:"Marc Seguí, Rauw Alejandro, Pol Grench",
        cover: "https://i.ytimg.com/vi/VEfkNHTjgs8/maxresdefault.jpg"
    },
    {
        title: "Neverita",
        url: "https://res.cloudinary.com/dgdoakzy1/video/upload/v1778728454/Bad_Bunny_-_Neverita_Video_Oficial_Un_Verano_Sin_Ti_mkllf8.mkv",
        artist:"Bad Bunny",
        cover: "https://i.ytimg.com/vi/ARWg160eaX4/maxresdefault.jpg"
    },
    {
        title: "Tarde",
        url: "https://res.cloudinary.com/dgdoakzy1/video/upload/v1778728575/Morat_-_Tarde_Video_Oficial_re1b28.mkv",
        artist:"Morat",
        cover: "https://i.ytimg.com/vi/U29h5Ocgj30/maxresdefault.jpg"
    },
    {
        title: "París",
        url: "https://res.cloudinary.com/dgdoakzy1/video/upload/v1777844054/Morat_Duki_-_Par%C3%ADs_Video_Oficial_wgvzys.mp4",
        artist:"Morat, Duki",
        cover: "https://i.ytimg.com/vi/cHsKzdyXDH0/maxresdefault.jpg"
    },
    {
        title: "YaMeFui",
        url: "https://upcdn.io/kW2K8s8/raw/Bizarrap%20x%20Duki%20x%20Nicki%20Nicole%20-%20YaMeFui.mp4",
        artist:"Bizarrap, Duki, Nicki Nicole",
        cover: "https://i.ytimg.com/vi/jAd9kZDpQoc/maxresdefault.jpg"
    },
    {
        title: "Llori Pari",
        url: "https://res.cloudinary.com/dgdoakzy1/video/upload/v1777175123/Alvaro_Diaz_Feid_ft._Tainy_-_Llori_Pari_Official_Video_mca8mq.mp4",
        artist:"Tainy, Alvaro Díaz, Feid",
        cover: "https://img.youtube.com/vi/A0oD0dl48IM/maxresdefault.jpg"
    },
    {
        title: "Reina Pepiada",
        url: "https://res.cloudinary.com/dgdoakzy1/video/upload/v1777344623/%C3%81lvaro_D%C3%ADaz_-_Reina_Pepiada_Lyric_Video_n3jmtg.mp4",
        artist:"Alvaro Díaz",
        cover: "https://i.ytimg.com/vi/Zn37zIBGv5M/maxresdefault.jpg"
    },
    {
        title: "COSAS QUE NO TE DIJE",
        url: "https://res.cloudinary.com/dgdoakzy1/video/upload/v1777762492/Saiko_-_COSAS_QUE_NO_TE_DIJE_Official_Video_8obld3JrBNM_az4hqm.mkv",
        artist:"Saiko",
        cover: "https://i.ytimg.com/vi/8obld3JrBNM/maxresdefault.jpg"
    },
    {
        title: "No Hay Más Que Hablar",
        url: "https://upcdn.io/kW2K8s8/raw/Morat%20-%20No%20Hay%20M%C3%A1s%20Que%20Hablar.mkv",
        artist:"Morat",
        cover: "https://i.ytimg.com/vi/YbBeQiJmsrg/maxresdefault.jpg"
    },
    {
        title: "Bajo La Mesa",
        url: "https://res.cloudinary.com/dgdoakzy1/video/upload/v1778728582/Morat_Sebasti%C3%A1n_Yatra_-_Bajo_La_Mesa_ukodte.mkv",
        artist:"Morat, Sebastián Yatra",
        cover: "https://i.ytimg.com/vi/hVR5KK2T8zQ/sddefault.jpg?v=5ebbdada"
    },
];
